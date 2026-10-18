export function createFocusTimer(minutes = 25, now = () => Date.now()) {
  let duration = minutes * 60_000;
  let remaining = duration;
  let deadline = null;
  let completed = false;
  return {
    snapshot() {
      if (deadline !== null) {
        remaining = Math.max(0, deadline - now());
        if (remaining === 0) { deadline = null; completed = true; }
      }
      return { remaining, seconds: Math.ceil(remaining / 1000), running: deadline !== null, completed, duration };
    },
    start() {
      if (deadline !== null) return;
      if (remaining <= 0) { remaining = duration; completed = false; }
      deadline = now() + remaining;
    },
    pause() {
      this.snapshot();
      deadline = null;
    },
    reset(nextMinutes = duration / 60_000) {
      duration = nextMinutes * 60_000; remaining = duration; deadline = null; completed = false;
    },
  };
}
export function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export const ideas = Object.freeze({
  useful: [
    'Make a tiny page that turns a messy list into a clean checklist.',
    'Build a one-screen tool that helps someone pick their next small task.',
    'Create a packing list that changes with the weather and trip length.',
    'Make a simple calculator for splitting a shared grocery bill.',
    'Build a reading list that asks what you want to learn, not how many books you own.',
    'Create a kitchen timer that can keep track of three things at once.',
    'Make a tool that turns a date into a friendly countdown to something good.',
    'Build a tiny page for comparing two choices, one honest question at a time.',
  ],
  playful: [
    'Build a compliment generator for people who just finished a difficult task.',
    'Make a tiny digital garden that grows when you take a real break.',
    'Create a desk-pet that celebrates your smallest completed task.',
    'Build a one-button instrument using everyday household sounds.',
    'Make a silly name generator for very serious imaginary businesses.',
    'Create a map of the best imaginary places to take a dog for a walk.',
    'Build a tiny game where the only objective is to make a robot smile.',
    'Make a page that turns a boring to-do list into a small adventure.',
  ],
  makers: [
    'Take one feature from a complicated app and make a useful standalone version.',
    'Build a project page that explains one idea using just a picture and fifty words.',
    'Create a color-palette tool inspired by objects already on your desk.',
    'Make a launch checklist short enough to actually finish.',
    'Build a tiny decision log: what you chose, why, and when to revisit it.',
    'Create a tool that helps turn a vague idea into a one-day prototype.',
    'Make a before-and-after image slider for showing work in progress.',
    'Build an idea notebook that asks what you can leave out of the first version.',
  ],
});
export function fetchIdea(category, previous = '', random = Math.random) {
  const pool = ideas[category];
  if (!pool) throw new Error('Unknown idea category.');
  const candidates = pool.filter(idea => idea !== previous);
  return candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))];
}
