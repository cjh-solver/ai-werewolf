const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('streamed speech never restarts, pauses and completes on fast-forward', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = html.indexOf('const TYPER = {');
  const end = html.indexOf('\nfunction msgSpeech(', start);
  assert.ok(start >= 0 && end > start);
  let next = 0, now = 0;
  const frames = new Map();
  const context = { PAUSED: false, scrollFeed() {},
    requestAnimationFrame(fn) { const id = ++next; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); } };
  vm.createContext(context);
  vm.runInContext(html.slice(start, end) + '\nthis.typer = TYPER;', context);
  const values = [];
  const stream = context.typer.stream(text => values.push(text));
  const frame = ms => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
  stream.update('abcdef'); frame(20); frame(90);
  stream.update('abcdefghijkl'); frame(90);
  context.PAUSED = true;
  const beforePause = values.at(-1);
  frame(300);
  assert.equal(values.at(-1), beforePause);
  context.PAUSED = false;
  frame(90);
  context.typer.cancelAll();
  assert.equal(values.at(-1), 'abcdefghijkl');
  for (let i = 1; i < values.length; i++) assert.ok(values[i].startsWith(values[i - 1]));
  assert.equal(context.typer.live.size, 0);
});

test('stream reader captures the final usage event even when choices are empty', async () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const start = html.indexOf("const STREAM_FALLBACK = new Error('STREAM_FALLBACK');");
  const end = html.indexOf('/* 任务级温度', start);
  assert.ok(start >= 0 && end > start);
  const encoder = new TextEncoder();
  const frames = [
    'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
    'data: {"choices":[],"usage":{"prompt_tokens":100,"completion_tokens":20,"prompt_tokens_details":{"cached_tokens":40}}}\n\n',
    'data: [DONE]\n\n'
  ];
  let request;
  const context = {
    CFG: { timeout: 60 }, RUN: 1, AbortController, TextDecoder, setTimeout, clearTimeout,
    StopGame: class extends Error {}, estimateTokens: s => s.length,
    fetch: async (_url, options) => {
      request = JSON.parse(options.body);
      let i = 0;
      return { ok: true, body: { getReader: () => ({ read: async () => i < frames.length
        ? { done: false, value: encoder.encode(frames[i++]) } : { done: true } }) } };
    }
  };
  vm.createContext(context);
  vm.runInContext(html.slice(start, end) + '\nthis.runStream = attemptStream;', context);
  const result = await context.runStream({ provider: 'qwen', key: 'test' }, 'https://example.test',
    { messages: [{ content: 'hello' }] }, () => {}, 1);
  assert.equal(request.stream_options.include_usage, true);
  assert.equal(result.content, 'Hello');
  assert.equal(result.usage.prompt_tokens, 100);
  assert.equal(result.usage.prompt_tokens_details.cached_tokens, 40);
});
