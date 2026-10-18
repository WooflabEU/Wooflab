# WoofLabin käyttöönotto

[Deploy-ohje (English, oletus)](../DEPLOYMENT.md) ·
[Takaisin projektiin](../README.md) · [English setup guide](SETUP.md)

Sivusto: [wooflab.eu](https://wooflab.eu).
Lähdekoodi: [wooflabEU/wooflab](https://github.com/wooflabEU/wooflab).

Jos asennat oman kopion sivustosta, käytä omaa verkkotunnusta,
Supabase-projektia ja X-sovellusta.

## 1. Paikallinen kehitys

Suositus on Node.js 22.18.0 tai uudempi tuettu versio; vähimmäisversio on 22.12.0.
Avaa terminaali kansiossa, jossa `package.json` sijaitsee:

```sh
npm ci
npm run dev
```

Vite näyttää paikallisen osoitteen, tavallisesti `http://localhost:5173`.

```sh
npm test
npm run build
npm run check
npm run preview
```

Testit käyttävät erillistä paikallista PGlite-tietokantaa. Ne eivät ota
yhteyttä tuotannon Supabase-tietokantaan. `check` ajetaan buildin jälkeen.

## 2. Supabase ja tietokanta

1. Luo projekti [Supabasessa](https://supabase.com/dashboard). Pienen sivuston
   lähtökohdaksi voi valita Free-paketin; tarkista sen ajantasaiset kiintiöt ja
   käyttämättömien projektien tauotuskäytäntö [hinnastosta](https://supabase.com/pricing).
2. Avaa **SQL Editor** ja suorita koko
   [001_guestbook.sql](../supabase/migrations/001_guestbook.sql).
3. Avaa projektin **Connect**-ikkuna. Kopioi **Project URL** ja
   **Publishable key**, joka alkaa `sb_publishable_`. Avaimet löytyvät myös
   kohdasta **Settings → API Keys**.

SQL luo vieraskirjan taulut, käyttöoikeudet, RLS-säännöt ja rajapintafunktiot.
Migraation voi ajaa uudelleen. Pelkkä avaimen lisääminen ei luo tietokantaa.

## 3. X-kirjautuminen

1. Avaa Supabasessa **Authentication → Sign In / Providers →
   X / Twitter (OAuth 2.0)**. Kopioi siellä näkyvä callback-osoite.
2. Luo sovellus [X Developer Portalissa](https://developer.x.com/).
3. Avaa **User authentication settings**. Valitse **Web App**, OAuth 2.0 ja
   **Request email from users** päälle. Sähköpostia ei julkaista vieraskirjassa.
4. Täytä X-sovelluksen osoitteet:

   | Kenttä | Arvo WoofLabin tuotannossa |
   | --- | --- |
   | Callback / Redirect URL | Supabasesta kopioitu callback-osoite |
   | Website | `https://wooflab.eu` |
   | Terms of service | `https://wooflab.eu/terms/` |
   | Privacy policy | `https://wooflab.eu/privacy/` |

5. Kopioi **OAuth 2.0 Client ID** ja **Client Secret** Supabasen X-asetuksiin.
   Ota palveluntarjoaja käyttöön ja tallenna.
6. Avaa Supabasessa **Authentication → URL Configuration**:

   | Asetus | Arvo |
   | --- | --- |
   | Site URL | `https://wooflab.eu` |
   | Redirect URL | `https://wooflab.eu/auth/callback/` |
   | Valinnainen paikallinen Redirect URL | `http://localhost:5173/auth/callback/` |

X palauttaa käyttäjän Supabasen `https://PROJEKTISI.supabase.co/auth/v1/callback`
-osoitteeseen. Supabase palauttaa käyttäjän WoofLabin `/auth/callback/`-sivulle.
Nämä ovat eri osoitteet. X:n API-pääsyn ehdot ja mahdolliset maksut määräytyvät
erikseen Supabasen paketista.

## 4. Sivuston julkiset asetukset

Muokkaa [public/site-config.json](../public/site-config.json):

```json
{
  "supabaseUrl": "https://PROJEKTISI.supabase.co",
  "supabasePublishableKey": "sb_publishable_OMA_JULKINEN_AVAIN",
  "contactEmail": "",
  "operatorName": "WoofLab"
}
```

Lisää toimiva yhteyssähköposti ja sivuston ylläpitäjän nimi omien tietojesi
mukaan. Yhteysosoite näkyy alatunnisteessa ja tietosuojasivulla, kun se on täytetty.
Tarkista myös, että tietosuojasivun sisältö vastaa sivustosi toimintaa.

Säilytä käytössä olevan sivuston asetukset päivityksissä. Git-julkaisussa
muokataan `public/site-config.json`-tiedostoa; build kopioi sen `dist`-kansioon.

Vaihtoehtoisesti Cloudflaren julkiset build-muuttujat
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` ja `VITE_CONTACT_EMAIL`
ohittavat vastaavat JSON-arvot. Näihin kuuluu vain selaimelle tarkoitettuja
arvoja. X:n Client Secret kuuluu Supabasen palveluntarjoajan asetuksiin.
Supabasen secret/service-role-avaimia ei laiteta sivuston tiedostoihin.

## 5. Julkaisu GitHubista Cloudflare Pagesiin

1. Pushaa lähdekoodi GitHub-repositoryn `master`-haaraan.
2. Avaa Cloudflaressa **Workers & Pages → Create application → Pages →
   Connect to Git** ja valitse repository.
3. Aseta Pages-projektin nimeksi sama nimi kuin
   [wrangler.jsonc](../wrangler.jsonc)-tiedoston `name`-kentässä.
4. Täytä build-asetukset:

   | Asetus | Arvo |
   | --- | --- |
   | Production branch | `master` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | Repon juuri, jossa `package.json` on |

5. Paina **Save and Deploy** ja kokeile etusivua annetussa `pages.dev`-osoitteessa.
6. Lisää oma verkkotunnus kohdasta **Custom domains**. Apex-domainin DNS-vyöhyke
   pitää olla samalla Cloudflare-tilillä ja käyttää Cloudflaren nimipalvelimia.
   Jos domain on vanhassa Pages-projektissa, siirrä liitos uuteen projektin
   buildin onnistuttua.
7. Testaa X-kirjautuminen lopullisessa HTTPS-osoitteessa.

Tässä projektissa käytetään **Pagesin Git-integraatiota**. Jos lokissa ajetaan
`npx wrangler deploy`, julkaisu on käynnistetty Workers Buildsissa. Palaa
silloin Pagesin käyttöönottoon: oikeassa näkymässä kysytään
**Build output directory**. Worker-scriptiä ei tarvita.

GitHub Actions tarkistaa projektin. Cloudflare rakentaa ja julkaisee
`master`-haaran muutokset erikseen; CI ei itsessään estä Cloudflaren julkaisua.
Direct Upload -projektista Git-integraatioon siirryttäessä luodaan uusi
Pages-projekti.

## 6. Vieraskirjan ylläpito-oikeus

Kirjaudu sivustolle omalla X-tililläsi kerran. Aja Supabasen SQL Editorissa:

```sql
select id, handle, display_name
from public.wooflab_profiles;
```

Kopioi oman profiilisi UUID ja sijoita se kyselyyn:

```sql
insert into wooflab_private.admins (user_id)
values ('OMA-SUPABASE-USER-UUID')
on conflict (user_id) do nothing;
```

Päivitä vieraskirja. Ylläpitäjä voi poistaa myös muiden kommentteja.

## 7. Tarkista toiminta

- Etusivu ja mobiilivalikko toimivat.
- Focus Fetchin ajastus, tauko ja nollaus sekä Idea Fetchin ideat toimivat.
- Kommentit näkyvät ilman kirjautumista.
- X-kirjautuminen ja viestin lähettäminen onnistuvat.
- Viesti näkyy myös uloskirjautumisen jälkeen.
- Oman kommentin poistaminen ja ylläpitäjän moderointi toimivat.

Kommentit julkaistaan heti. Pituus on 1–1 000 merkkiä ja lähetysväli vähintään
30 sekuntia käyttäjää kohti. Uloskirjautuminen ei poista viestejä.
Supabase Auth -käyttäjän poistaminen poistaa myös hänen profiilinsa ja kommenttinsa.
