-- WoofLab guestbook. Run once in the Supabase SQL Editor (safe to re-run).
-- No service-role key is needed in the browser. All write checks live here.
begin;

create schema if not exists wooflab_private;
revoke all on schema wooflab_private from public, anon, authenticated;

create table if not exists public.wooflab_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  x_user_id text not null unique,
  handle text,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint wooflab_handle_valid check (handle is null or handle ~ '^[A-Za-z0-9_]{1,15}$'),
  constraint wooflab_display_name_length check (char_length(display_name) between 1 and 80)
);
create table if not exists public.wooflab_comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.wooflab_profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint wooflab_comment_length check (char_length(body) between 1 and 1000 and body ~ '[^[:space:]]')
);
create index if not exists wooflab_comments_feed on public.wooflab_comments(created_at desc, id desc);
create index if not exists wooflab_comments_author on public.wooflab_comments(author_id);

create table if not exists wooflab_private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists wooflab_private.post_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_post_at timestamptz not null default 'epoch'
);
revoke all on all tables in schema wooflab_private from public, anon, authenticated;

-- Identity data comes from the X OAuth provider in auth.identities, never from
-- raw_user_meta_data (which an authenticated user can edit themselves).
create or replace function wooflab_private.sync_x_profile(p_user_id uuid, p_x_id text, p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_handle text;
  v_name text;
  v_avatar text;
begin
  if p_x_id is null or p_x_id = '' then return; end if;
  v_handle := coalesce(nullif(p_data->>'user_name',''), nullif(p_data->>'preferred_username',''), nullif(p_data->>'username',''));
  if v_handle is not null and v_handle !~ '^[A-Za-z0-9_]{1,15}$' then v_handle := null; end if;
  v_name := left(coalesce(nullif(btrim(p_data->>'name'),''), nullif(btrim(p_data->>'full_name'),''), v_handle, 'X member'),80);
  v_avatar := coalesce(nullif(p_data->>'avatar_url',''), nullif(p_data->>'picture',''), nullif(p_data->>'profile_image_url',''));
  if v_avatar is not null and v_avatar !~ '^https://(pbs|abs)[.]twimg[.]com/' then v_avatar := null; end if;
  insert into public.wooflab_profiles(id,x_user_id,handle,display_name,avatar_url)
    values(p_user_id,p_x_id,v_handle,v_name,v_avatar)
    on conflict(id) do update set x_user_id=excluded.x_user_id, handle=excluded.handle,
      display_name=excluded.display_name, avatar_url=excluded.avatar_url;
end;
$$;
revoke all on function wooflab_private.sync_x_profile(uuid,text,jsonb) from public, anon, authenticated;

create or replace function wooflab_private.on_x_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.provider = 'x' then
    perform wooflab_private.sync_x_profile(new.user_id,new.provider_id,new.identity_data);
  end if;
  return new;
end;
$$;
revoke all on function wooflab_private.on_x_identity() from public, anon, authenticated;
drop trigger if exists wooflab_sync_x_identity on auth.identities;
create trigger wooflab_sync_x_identity after insert or update of identity_data, provider_id
  on auth.identities for each row execute function wooflab_private.on_x_identity();

-- Include X accounts that signed in before the migration was installed.
do $$
declare identity_row record;
begin
  for identity_row in select user_id,provider_id,identity_data from auth.identities where provider='x' loop
    perform wooflab_private.sync_x_profile(identity_row.user_id,identity_row.provider_id,identity_row.identity_data);
  end loop;
end;
$$;

create or replace function public.wooflab_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from wooflab_private.admins where user_id=(select auth.uid()));
$$;
revoke all on function public.wooflab_is_admin() from public, anon, authenticated;
grant execute on function public.wooflab_is_admin() to authenticated;

alter table public.wooflab_profiles enable row level security;
alter table public.wooflab_comments enable row level security;
revoke all on public.wooflab_profiles, public.wooflab_comments from public, anon, authenticated;
grant select on public.wooflab_profiles, public.wooflab_comments to anon, authenticated;
grant delete on public.wooflab_comments to authenticated;

drop policy if exists wooflab_public_profiles on public.wooflab_profiles;
create policy wooflab_public_profiles on public.wooflab_profiles for select to anon, authenticated using(true);
drop policy if exists wooflab_public_comments on public.wooflab_comments;
create policy wooflab_public_comments on public.wooflab_comments for select to anon, authenticated using(true);
drop policy if exists wooflab_delete_comment on public.wooflab_comments;
create policy wooflab_delete_comment on public.wooflab_comments for delete to authenticated
  using ((select auth.uid())=author_id or (select public.wooflab_is_admin()));

-- The only insert path. The author, timestamp and ID are chosen by the server.
-- A locked private row makes the 30-second limit safe under concurrent posts,
-- and deleting a previous note does not reset this limit.
create or replace function public.wooflab_post_comment(p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_body text := btrim(p_body,E' \t\r\n');
  v_last timestamptz;
  v_id uuid;
begin
  if v_actor is null or not exists(select 1 from public.wooflab_profiles where id=v_actor)
    or not exists(select 1 from auth.identities where user_id=v_actor and provider='x') then
    raise exception 'x_identity_required' using errcode='42501';
  end if;
  if v_body is null or char_length(v_body) not between 1 and 1000 or v_body !~ '[^[:space:]]' then
    raise exception 'comment_length' using errcode='22023';
  end if;
  insert into wooflab_private.post_limits(user_id) values(v_actor) on conflict(user_id) do nothing;
  select last_post_at into v_last from wooflab_private.post_limits where user_id=v_actor for update;
  if v_last > clock_timestamp() - interval '30 seconds' then
    raise exception 'rate_limit' using errcode='P0001';
  end if;
  insert into public.wooflab_comments(author_id,body) values(v_actor,v_body) returning id into v_id;
  update wooflab_private.post_limits set last_post_at=clock_timestamp() where user_id=v_actor;
  return v_id;
end;
$$;
revoke all on function public.wooflab_post_comment(text) from public, anon, authenticated;
grant execute on function public.wooflab_post_comment(text) to authenticated;

-- Keyset pagination remains stable when new notes arrive between page loads.
create or replace function public.wooflab_list_comments(
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 21
)
returns table(id uuid,author_id uuid,body text,created_at timestamptz,display_name text,handle text,avatar_url text)
language sql stable security invoker set search_path = '' as $$
  select c.id,c.author_id,c.body,c.created_at,p.display_name,p.handle,p.avatar_url
  from public.wooflab_comments c join public.wooflab_profiles p on p.id=c.author_id
  where p_before_created_at is null or (c.created_at,c.id)<(p_before_created_at,p_before_id)
  order by c.created_at desc,c.id desc
  limit greatest(1,least(coalesce(p_limit,21),51));
$$;
revoke all on function public.wooflab_list_comments(timestamptz,uuid,integer) from public, anon, authenticated;
grant execute on function public.wooflab_list_comments(timestamptz,uuid,integer) to anon, authenticated;

commit;
