const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function renderOverview({ phase, hidden }) {
  const target = { innerHTML: '' };
  const context = {
    S: {
      phase,
      speaking: 2,
      seats: [
        { seat: 1, name: 'Observer', human: true, alive: true },
        { seat: 2, name: 'Private Actor', alive: true, spec: { model: 'Example' } }
      ],
      log: [{ kind: 'vote', round: 1, picks: [{ from: 1, to: 2 }] }]
    },
    $: id => id === 'arenaContent' ? target : { textContent: 'Private night action' },
    secretsHidden: () => hidden,
    avatarSVG: () => '<svg aria-hidden="true"></svg>',
    specLabel: spec => spec.model,
    seatModelShort: () => 'Example',
    esc: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/arena.js'), 'utf8') + '\nrenderArenaOverview();', context);
  return target.innerHTML;
}

test('hides night actor and private status in player view', () => {
  const html = renderOverview({ phase: 'night', hidden: true });
  assert.match(html, /夜间行动中/);
  assert.doesNotMatch(html, /Private Actor|Private night action/);
  assert.doesNotMatch(html, /intel-portrait"><svg/);
  assert.match(html, /最近一次公开投票/);
});

test('shows the current speaker in the public day phase', () => {
  const html = renderOverview({ phase: 'day', hidden: true });
  assert.match(html, /2 号 · Private Actor/);
  assert.match(html, /最近一次公开投票/);
  assert.match(html, /1 号投给 2 号/);
  assert.match(html, /intel-model-segments.*class="alive"/);
});

test('nighttime player view does not mark the acting seat as speaking', () => {
  const context = { S: { phase: 'night', speaking: 2 }, secretsHidden: () => true };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/arena.js'), 'utf8') +
    '\nthis.visible = isPublicSpeaker;', context);
  assert.equal(context.visible(2), false);
  context.S.phase = 'day';
  assert.equal(context.visible(2), true);
});

test('journal type and seat filters also apply to newly appended messages', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/arena.js'), 'utf8') +
    '\nthis.filter = applySpeechFilter; this.select = (kind, seat) => { feedKind = kind; speechFilterSeat = seat; };', context);
  const message = (speech, seat) => ({ classList: { contains: name => name === 'speech' && speech }, dataset: { seat }, hidden: false });
  const first = message(true, 2);
  const other = message(true, 3);
  const event = message(false);
  context.select('speech', 2);
  [first, other, event].forEach(context.filter);
  assert.equal(first.hidden, false);
  assert.equal(other.hidden, true);
  assert.equal(event.hidden, true);
  context.select('event', null);
  [first, event].forEach(context.filter);
  assert.equal(first.hidden, true);
  assert.equal(event.hidden, false);
});

test('provider badges use known local assets and a safe fallback', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/arena.js'), 'utf8') + '\nthis.icon = providerIcon;', context);
  for (const provider of ['deepseek', 'doubao', 'qwen', 'hunyuan', 'kimi', 'zhipu', 'ollama']) {
    const markup = context.icon(provider);
    const match = markup.match(/src="([^"]+)"/);
    assert.ok(match, provider);
    assert.ok(fs.existsSync(path.join(__dirname, '..', match[1])), provider);
  }
  assert.match(context.icon('custom'), /arena-model-mark-generic/);
  assert.doesNotMatch(context.icon('" onerror="alert(1)'), /onerror/);
});
