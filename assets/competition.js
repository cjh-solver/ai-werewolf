const COMPETITION_RECORDS_KEY = 'ww.matches.v2';

function competitionBucket(key, game, mode, difficulty) {
  const context = { size: game.seats.length, winMode: game.winMode, sheriff: !!game.sheriffOn,
    saveStack: !!game.saveStackOn, mode, difficulty: mode === 'play' ? difficulty : '' };
  return { context, key: JSON.stringify([key, context.size, context.winMode, context.sheriff,
    context.saveStack, context.mode, context.difficulty]) };
}

function createCompetitionRecord(game, mode) {
  return {
    version: 2,
    at: Date.now(),
    mode,
    round: game.round,
    winner: game.winner,
    adjudicated: !!game.adjudicated,
    rules: { size: game.seats.length, winMode: game.winMode, sheriff: game.sheriffOn, saveStack: game.saveStackOn },
    seats: game.seats.map(s => ({
      seat: s.seat, name: s.name, role: s.role, human: !!s.human, alive: !!s.alive,
      model: s.spec ? { provider: s.spec.provider, model: s.spec.model } : null,
      intervened: !!s.intervened
    })),
    log: (game.log || []).filter(e => ['speech', 'lastword', 'vote', 'out', 'explode'].includes(e.kind)).map(e => ({
      kind: e.kind, round: e.round, seat: e.seat, name: e.name, text: e.text, pk: !!e.pk,
      picks: e.kind === 'vote' ? (e.picks || []).map(v => ({ from: v.from, to: v.to, reason: v.reason || '' })) : undefined
    })),
    modelEvents: (game.modelEvents || []).map(e => ({
      callId: e.callId, round: e.round, phase: e.phase, seat: e.seat, task: e.task,
      kind: e.kind, original: e.original, actual: e.actual, detail: e.detail
    }))
  };
}

function readCompetitionRecords(storage) {
  const raw = storage.getItem(COMPETITION_RECORDS_KEY);
  if (!raw) return [];
  const records = JSON.parse(raw);
  if (!Array.isArray(records)) throw new Error('Invalid competition records');
  return records;
}

function saveCompetitionRecord(storage, record) {
  try {
    const records = readCompetitionRecords(storage);
    records.push(record);
    storage.setItem(COMPETITION_RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch (e) { return false; }
}
