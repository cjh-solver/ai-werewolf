const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadTts({ native = true, voices = [], play, protocol = 'https:', nativeError = false } = {}) {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = html.indexOf('const TTS = (() => {');
  const end = html.indexOf('\n/* ============================================================\n   情绪节点', start);
  assert.ok(start >= 0 && end > start);
  const audio = [], notices = [], spoken = [];
  class Audio {
    constructor(url) { this.url = url; this.paused = true; audio.push(this); }
    play() { return play ? play(this) : new Promise(() => {}); }
    pause() { this.paused = true; }
  }
  class Utterance { constructor(text) { this.text = text; } }
  const synth = native ? {
    speaking: false, pending: false,
    getVoices: () => voices,
    addEventListener() {}, cancel() {}, resume() {},
    speak(utterance) { spoken.push(utterance); (nativeError ? utterance.onerror : utterance.onstart)(); }
  } : undefined;
  const context = {
    window: { Audio, speechSynthesis: synth, SpeechSynthesisUtterance: native ? Utterance : undefined },
    Audio, SpeechSynthesisUtterance: Utterance, location: { protocol },
    toast: message => notices.push(message), console: { warn() {} },
    setTimeout: () => 1, clearTimeout() {}, FAST: false,
    pSleep: async () => {}, sleep: async () => {}, clip: s => s
  };
  vm.createContext(context);
  vm.runInContext(html.slice(start, end) + '\nthis.tts = TTS;', context);
  return { tts: context.tts, audio, notices, spoken };
}

test('voice test works with and without an available Chinese voice', () => {
  for (const voices of [[], [{ name: 'Chinese', lang: 'zh-CN' }]]) {
    const { tts, notices, spoken } = loadTts({ voices });
    assert.equal(tts.test(), true);
    assert.equal(spoken.length, 1);
    assert.match(notices[0], /试播/);
  }
});

test('loading audio remains busy until playback ends or is cancelled', () => {
  const { tts, audio } = loadTts();
  tts.speech('发言内容', '玩家', {});
  assert.equal(audio.length, 1);
  assert.equal(tts.speaking, true);
  audio[0].onended();
  assert.equal(tts.speaking, false);
  tts.speech('下一句', '玩家', {});
  tts.stop();
  assert.equal(tts.speaking, false);
});

test('edge error and rejected playback trigger native fallback only once', async () => {
  const { tts, audio, spoken } = loadTts({ play: () => Promise.reject(new Error('unavailable')) });
  tts.speech('发言内容', '玩家', {});
  audio[0].onerror();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(spoken.length, 1);
  assert.equal(tts.speaking, false);
});

test('online playback rejection is visible and does not stay busy', async () => {
  const { tts, notices } = loadTts({ native: false, play: () => Promise.reject(new Error('blocked')) });
  tts.test();
  await Promise.resolve();
  assert.equal(tts.speaking, false);
  assert.ok(notices.some(message => message.includes('语音播放失败')));
});

test('local file reports native speech failure without claiming online fallback', () => {
  const { tts, notices, audio } = loadTts({ protocol: 'file:', nativeError: true });
  tts.test();
  assert.equal(audio.length, 0);
  assert.ok(notices.some(message => message.includes('本机语音播放失败')));
  assert.ok(notices.some(message => message.includes('本地文件无法使用在线')));
});
