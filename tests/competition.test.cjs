const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCompetition() {
  const context = { Date };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/competition.js'), 'utf8') +
    '\nthis.api = { createCompetitionRecord, saveCompetitionRecord, readCompetitionRecords, competitionBucket };', context);
  return context.api;
}

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

test('archives public game data without model credentials or private memory', () => {
  const api = loadCompetition();
  const game = { round: 2, winner: 'good', winMode: 'edge', sheriffOn: false, saveStackOn: true,
    seats: [{ seat: 1, name: 'Player', role: 'SEER', alive: true, spec: { provider: 'x', model: 'y', key: 'secret-key' },
      seerLog: [{ seat: 2, isWolf: true }], mem: ['secret-memory'] }],
    log: [{ kind: 'speech', round: 2, seat: 1, text: 'Public statement', whisper: 'private thought' }], modelEvents: [] };
  const record = api.createCompetitionRecord(game, 'watch');
  const data = JSON.stringify(record);
  assert.match(data, /Public statement/);
  assert.doesNotMatch(data, /secret-key|secret-memory|private thought|seerLog/);
  const store = storage();
  assert.equal(api.saveCompetitionRecord(store, record), true);
  assert.equal(api.readCompetitionRecords(store).length, 1);
});

test('does not overwrite malformed existing archives', () => {
  const api = loadCompetition();
  const store = storage({ 'ww.matches.v2': 'invalid-json' });
  assert.equal(api.saveCompetitionRecord(store, {}), false);
  assert.equal(store.getItem('ww.matches.v2'), 'invalid-json');
});

test('does not combine model scores across boards, sheriff rules or player modes', () => {
  const api = loadCompetition();
  const game = { seats: Array(9), winMode: 'edge', sheriffOn: false, saveStackOn: true };
  const watch = api.competitionBucket('A', game, 'watch', 'standard').key;
  assert.notEqual(watch, api.competitionBucket('A', { ...game, seats: Array(12) }, 'watch', 'standard').key);
  assert.notEqual(watch, api.competitionBucket('A', { ...game, sheriffOn: true }, 'watch', 'standard').key);
  assert.notEqual(watch, api.competitionBucket('A', game, 'play', 'hard').key);
});

test('marks substituted and fallback seats without excluding a simple retry', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = html.indexOf('function recordModelEvent(');
  const end = html.indexOf('\nfunction modelEventLabel(', start);
  assert.ok(start >= 0 && end > start);
  const context = { S: { round: 1, phase: 'day', seats: [{ seat: 1 }, { seat: 2 }, { seat: 3 }], modelEvents: [] },
    renderArenaOverview() {}, modelEventLabel() { return ''; } };
  vm.createContext(context);
  vm.runInContext(html.slice(start, end) + '\nthis.record = recordModelEvent;', context);
  context.record({ kind: 'retry', seat: 1 });
  context.record({ kind: 'response', seat: 2, original: 'model A', actual: 'model B' });
  context.record({ kind: 'fallback', seat: 3 });
  assert.equal(!!context.S.seats[0].intervened, false);
  assert.equal(context.S.seats[1].intervened, true);
  assert.equal(context.S.seats[2].intervened, true);
});

test('masked player snapshots omit roles, keys, private actions and call events', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = html.indexOf("const SNAP_KEY = 'ww.snap';");
  const end = html.indexOf('\nfunction readSnap()', start);
  assert.ok(start >= 0 && end > start);
  const store = storage();
  const context = { localStorage: store, MODE: 'play', HUMAN: 1, DIFF: 'standard', humanAlive: () => true,
    S: { round: 1, winner: null, competitionVersion: 2, wolfPlan: 'SECRET_WOLF_PLAN',
      modelEvents: [{ task: 'SECRET_ACTION' }], seats: [{ seat: 1, name: 'Player', alive: true, human: true,
        role: 'SECRET_ROLE', spec: { provider: 'x', model: 'm', key: 'SECRET_KEY' }, mem: ['SECRET_MEMORY'] }],
      log: [{ kind: 'speech', text: 'Public', whisper: 'SECRET_WHISPER' }] }, console };
  vm.createContext(context);
  vm.runInContext(html.slice(start, end) + '\nsaveSnap();', context);
  const data = store.getItem('ww.snap');
  assert.ok(data);
  assert.match(data, /Public/);
  assert.doesNotMatch(data, /SECRET_/);
});

test('legacy ladder data stays separate from competition data', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = html.indexOf("const LADDER_KEY = 'ww.ladder.v2';");
  const end = html.indexOf('\nfunction writeLadder(', start);
  assert.ok(start >= 0 && end > start);
  const context = { localStorage: storage({
    'ww.ladder': JSON.stringify({ v: 1, games: 4, models: {} }),
    'ww.ladder.v2': JSON.stringify({ v: 1, games: 2, models: {} })
  }) };
  vm.createContext(context);
  vm.runInContext(html.slice(start, end) + '\nthis.read = readLadder;', context);
  assert.equal(context.read().games, 2);
  assert.equal(context.read(true).games, 4);
});

test('manual games rotate model assignment and previews do not advance it', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = html.indexOf('function assignSpecs(');
  const end = html.indexOf('\n/* ============================================================', start);
  assert.ok(start >= 0 && end > start);
  const context = { localStorage: storage(), usablePool: () => ['A', 'B', 'C', 'D'] };
  vm.createContext(context);
  vm.runInContext(html.slice(start, end) + '\nthis.assign = assignSpecs;', context);
  assert.deepEqual(Array.from(context.assign(4)), ['A', 'B', 'C', 'D']);
  assert.deepEqual(Array.from(context.assign(4, true)), ['A', 'B', 'C', 'D']);
  assert.deepEqual(Array.from(context.assign(4, true)), ['B', 'C', 'D', 'A']);
});

test('competition win denominators exclude intervened seats', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = html.indexOf('function finishGame() {');
  const end = html.indexOf('  if (!S.simulated && !S.adjudicated) mergeLadder();', start);
  assert.ok(start >= 0 && end > start);
  const stats = new Map();
  const context = { window: {}, clearSnap() {}, SPEC_STATS: stats,
    S: { winner: 'good', seats: [
      { seat: 1, role: 'SEER', spec: { model: 'A' } },
      { seat: 2, role: 'WOLF', spec: { model: 'A' }, intervened: true }
    ] },
    isWolfRole: role => role === 'WOLF', specKey: spec => spec.model,
    specStat(spec) {
      if (!stats.has(spec.model)) stats.set(spec.model, { seats: new Set(), wolves: 0, goods: 0, wins: 0, winsAsWolf: 0, winsAsGood: 0 });
      return stats.get(spec.model);
    } };
  vm.createContext(context);
  vm.runInContext(html.slice(start, end) + '\n}\nthis.settle = finishGame;', context);
  context.settle();
  const result = stats.get('A');
  assert.equal(result.seats.size, 1);
  assert.equal(result.goods, 1);
  assert.equal(result.wolves, 0);
  assert.equal(result.wins, 1);
});
