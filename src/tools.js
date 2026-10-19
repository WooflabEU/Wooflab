import { createFocusTimer, formatTime, fetchIdea } from './lib/experiments.js';
import { toast } from './lib/ui.js';

let ready = false;
const timer = createFocusTimer();
let ticker;
let category = 'useful';
let currentIdea = '';
const originalTitle = document.title;
let announcedCompletion = false;

function updateTimer() {
  const state = timer.snapshot();
  document.querySelector('#focus-time').textContent = formatTime(state.seconds);
  document.querySelector('#focus-toggle').textContent = state.running ? 'Pause sprint' : state.completed ? 'Start another sprint →' : 'Start focusing →';
  document.title = state.running ? `${formatTime(state.seconds)} · Focus Fetch - WoofLab` : originalTitle;
  if (state.completed && !announcedCompletion) {
    announcedCompletion = true;
    document.querySelector('#focus-status').textContent = 'Good work. Time for a walk.';
    toast('Sprint complete. Good work - take a little break.');
  }
  if (!state.running) { clearInterval(ticker); ticker = undefined; }
}
function newIdea() {
  currentIdea = fetchIdea(category, currentIdea);
  document.querySelector('#idea-output').textContent = currentIdea;
}
function initialize() {
  if (ready) return;
  ready = true;
  document.querySelectorAll('.tool-dialog').forEach(dialog => {
    dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
  });
  document.querySelector('#focus-toggle').addEventListener('click', () => {
    if (timer.snapshot().running) {
      timer.pause();
      document.querySelector('#focus-status').textContent = 'Paused. Take a breath.';
    } else {
      timer.start(); announcedCompletion = false;
      document.querySelector('#focus-status').textContent = 'One thing at a time. You’ve got this.';
      clearInterval(ticker); ticker = setInterval(updateTimer, 250);
    }
    updateTimer();
  });
  document.querySelector('#focus-reset').addEventListener('click', () => {
    timer.reset(); announcedCompletion = false;
    document.querySelector('#focus-status').textContent = 'Ready when you are.'; updateTimer();
  });
  document.querySelectorAll('[data-duration]').forEach(button => button.addEventListener('click', () => {
    timer.reset(Number(button.dataset.duration)); announcedCompletion = false;
    document.querySelectorAll('[data-duration]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    document.querySelector('#focus-status').textContent = 'Ready when you are.'; updateTimer();
  }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateTimer(); });
  document.querySelector('#idea-fetch').addEventListener('click', newIdea);
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category;
    document.querySelectorAll('[data-category]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    newIdea();
  }));
  document.querySelector('#idea-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(currentIdea); toast('Idea copied. Go make something.'); }
    catch { toast('Select the idea text to copy it.'); }
  });
  newIdea();
}
export function openTool(name) {
  initialize();
  const id = name === 'focus' ? '#focus-dialog' : '#ideas-dialog';
  const dialog = document.querySelector(id);
  if (!dialog.open) dialog.showModal();
  if (name === 'focus') updateTimer();
}
