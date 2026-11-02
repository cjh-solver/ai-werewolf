const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

function extract(startText, endText) {
  const start = html.indexOf(startText);
  const end = html.indexOf(endText, start);
  assert.ok(start >= 0 && end > start);
  return html.slice(start, end);
}

test('six-player parity and nine/twelve-player edge wins are distinct', () => {
  const context = {
    S: { winMode: 'parity', seats: [] },
    aliveSeats() { return this.S.seats.filter(s => s.alive); },
    isWolfRole: role => role === 'WOLF',
    campOf: role => role === 'SEER' ? 'god' : role === 'VILLAGER' ? 'villager' : 'wolf'
  };
  context.aliveSeats = () => context.S.seats.filter(s => s.alive);
  vm.createContext(context);
  vm.runInContext(extract('function checkWin()', '\n/* ============================================================') + '\nthis.win = checkWin;', context);
  context.S.seats = ['WOLF', 'VILLAGER'].map(role => ({ role, alive: true }));
  assert.equal(context.win(), 'wolf');
  context.S.winMode = 'edge';
  context.S.seats = ['WOLF', 'VILLAGER', 'SEER'].map(role => ({ role, alive: true }));
  assert.equal(context.win(), null);
  context.S.seats[2].alive = false;
  assert.equal(context.win(), 'wolf');
  context.S.seats[0].alive = false;
  assert.equal(context.win(), 'good');
});

test('equal votes enter PK and repeated ties eliminate nobody', async () => {
  const context = { S: { round: 1, sheriff: null, log: [] }, singVotes: async () => {}, clearLiveTally() {},
    renderVoteBox() {}, drawVoteArrows() {}, setTimeout() {}, Map };
  vm.createContext(context);
  vm.runInContext(extract('function topSeat(map)', '\n/* ============================================================') +
    extract('async function resolveVote(', '\nfunction renderVoteBox(') + '\nthis.resolve = resolveVote;', context);
  const votes = [{ from: 1, to: 2 }, { from: 2, to: 1 }];
  const first = await context.resolve(votes, 1, false);
  assert.equal(first.outSeat, null);
  assert.deepEqual(Array.from(first.tie), [2, 1]);
  const second = await context.resolve(votes, 1, true);
  assert.equal(second.outSeat, null);
  assert.equal(second.tie.length, 0);
  assert.equal(context.S.log.length, 2);
});

test('speech contract permits uncertainty and wolf role deception', () => {
  const context = { CFG: { speechLen: 'normal' }, modelProfile: () => ({ jsonOut: false }), speakSkeleton: () => '自然表达。' };
  vm.createContext(context);
  vm.runInContext(extract('const LEN_SPEC =', '\nfunction sysPrompt(') + '\nthis.contract = outputContract;', context);
  const text = context.contract('speak', true, {}).join('\n');
  assert.match(text, /保留判断/);
  assert.match(text, /假扮神职/);
  assert.match(text, /可以不写/);
  assert.doesNotMatch(text, /必须做到三件事|这一行必须写|必须把自己说成好人/);
});

test('round limit is a draw and final bets are returned', async () => {
  const context = { S: { round: 16, history: [] }, MAX_ROUNDS: 15, gate: async () => {},
    msgEvent() {}, godMsg() {}, BET: { final: 'wolf', chips: 30, log: [] }, updateChips() {} };
  vm.createContext(context);
  vm.runInContext(extract('async function runRoundLoop(', '\nasync function startGame(') +
    extract('function settleFinalBet(', '\n/* ============================================================') +
    '\nthis.run = runRoundLoop; this.settle = settleFinalBet;', context);
  await context.run(1);
  assert.equal(context.S.winner, 'draw');
  assert.equal(context.S.adjudicated, true);
  context.settle('draw');
  assert.equal(context.BET.chips, 50);
  assert.equal(context.BET.final, null);
});
