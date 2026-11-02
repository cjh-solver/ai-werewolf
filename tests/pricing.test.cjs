const test = require('node:test');
const assert = require('node:assert/strict');
const { usageQuote } = require('../assets/pricing.js');

const spec = (provider, model, base) => ({ provider, model, base });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('Hunyuan counts cached input and output at separate official rates', () => {
  const q = usageQuote(spec('hunyuan', 'hy4-preview', '/api/proxy?target=https://tokenhub.tencentmaas.com/v1'),
    { prompt_tokens: 100000, completion_tokens: 50000, prompt_tokens_details: { cached_tokens: 50000 } }, false);
  assert.equal(q.priced, true);
  close(q.min, 1.215);
  close(q.max, 1.215);
});

test('DeepSeek peak and off-peak rates form an explicit range', () => {
  const q = usageQuote(spec('deepseek', 'deepseek-flash', 'https://api.deepseek.com/v1'),
    { prompt_tokens: 1000000, completion_tokens: 1000000, prompt_cache_hit_tokens: 500000 }, false);
  close(q.min, 4.51);
  close(q.max, 9.02);
});

test('unknown cache produces a range rather than assuming a cache hit or miss', () => {
  const q = usageQuote(spec('qwen', 'qwen3.8-flash', 'https://dashscope.aliyuncs.com/compatible-mode/v1'),
    { prompt_tokens: 1000000, completion_tokens: 100000 }, false);
  close(q.min, .37);
  close(q.max, 1.07);
  assert.equal(q.cacheKnown, false);
});

test('tiered Qwen pricing is selected per request', () => {
  const model = spec('qwen', 'qwen3.7-plus', 'https://dashscope.aliyuncs.com/compatible-mode/v1');
  const low = usageQuote(model, { prompt_tokens: 256000, completion_tokens: 1000, prompt_cache_hit_tokens: 0 }, false);
  const high = usageQuote(model, { prompt_tokens: 256001, completion_tokens: 1000, prompt_cache_hit_tokens: 0 }, false);
  close(low.max, .52);
  close(high.max, 1.560006);
});

test('Zhipu official route uses the verified GLM Flash rate', () => {
  const q = usageQuote(spec('zhipu', 'glm-5.3-flash', '/api/proxy?target=https://open.bigmodel.cn/api/paas/v4'),
    { prompt_tokens: 1000000, completion_tokens: 1000000, prompt_cache_hit_tokens: 0 }, false);
  close(q.min, 3.6);
  close(q.max, 3.6);
});

test('unknown endpoint, model and out-of-range input remain unpriced', () => {
  const usage = { prompt_tokens: 100, completion_tokens: 10 };
  assert.equal(usageQuote(spec('doubao', 'ep-unknown', 'https://ark.cn-beijing.volces.com/api/v3'), usage, false).priced, false);
  assert.equal(usageQuote(spec('hunyuan', 'hy3', 'https://example.com/v1'), usage, false).priced, false);
  assert.equal(usageQuote(spec('hunyuan', 'hy3', 'https://example.com/v1?target=https://tokenhub.tencentmaas.com'), usage, false).priced, false);
  assert.equal(usageQuote(spec('qwen', 'qwen3.7-plus', 'https://dashscope.aliyuncs.com/v1'),
    { prompt_tokens: 1000001, completion_tokens: 10 }, false).priced, false);
});
