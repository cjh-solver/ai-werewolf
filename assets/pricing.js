/* Text inference list prices, CNY per million tokens; checked 2026-11-02. */
(function (root) {
  'use strict';
  const sources = {
    deepseek: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
    doubao: 'https://docs.volcengine.com/docs/ark/model-pricing?lang=zh',
    qwen: 'https://help.aliyun.com/zh/model-studio/model-pricing',
    hunyuan: 'https://cloud.tencent.com/document/product/1823/130055',
    zhipu: 'https://docs.bigmodel.cn/cn/guide/start/pricing',
    kimi: 'https://platform.moonshot.cn/docs/pricing/chat'
  };
  const routes = {
    deepseek: 'api.deepseek.com', doubao: 'ark.cn-beijing.volces.com',
    qwen: 'dashscope.aliyuncs.com', hunyuan: 'tokenhub.tencentmaas.com', zhipu: 'open.bigmodel.cn'
  };
  const rates = {
    'deepseek|deepseek-flash': { peak: [2, .04, 8], off: [1, .02, 4] },
    'deepseek|deepseek-v4-pro': { peak: [9, .30, 27], off: [4.5, .15, 13.5] },
    'doubao|doubao-seed-2-1-lite-260915': { tiers: [[1024000, .8, .16, 2.7]] },
    'doubao|doubao-seed-2-1-turbo-260628': { tiers: [[256000, 3, .6, 15]] },
    'doubao|doubao-seed-2-1-pro-260915': { tiers: [[1024000, 6, 1.2, 30]] },
    'doubao|doubao-seed-2-1-pro-260628': { tiers: [[1024000, 6, 1.2, 30]] },
    'qwen|qwen3.8-flash': { tiers: [[1000000, .8, .1, 2.7]] },
    'qwen|qwen3.8-max': { tiers: [[1000000, 12, 1.5, 36]] },
    'qwen|qwen3.7-plus': { tiers: [[256000, 2, .4, 8], [1000000, 6, 1.2, 24]] },
    'hunyuan|hy4-preview': { tiers: [[1000000, 6, .3, 18]] },
    'hunyuan|hy3': { tiers: [[256000, 1, .25, 4]] },
    'hunyuan|hunyuan-role-latest': { tiers: [[32000, 2.4, 2.4, 9.6]] },
    'zhipu|glm-5.3': { tiers: [[1000000, 8, 2, 28]] },
    'zhipu|glm-5.3-flash': { tiers: [[1000000, .8, .23, 2.8]] },
    'zhipu|glm-5.2': { tiers: [[1000000, 8, 2, 28]] }
  };

  function routeHost(base) {
    try {
      const url = new URL(base, 'http://local.invalid');
      const target = url.origin === 'http://local.invalid' && url.pathname === '/api/proxy' ? url.searchParams.get('target') : null;
      const destination = target ? new URL(target) : url;
      return destination.protocol === 'https:' && !destination.port ? destination.hostname.toLowerCase() : '';
    } catch (_) { return ''; }
  }

  function usageQuote(spec, usage, estimated) {
    const prompt = Number(usage && usage.prompt_tokens);
    const completion = Number(usage && usage.completion_tokens);
    if (!Number.isFinite(prompt) || !Number.isFinite(completion) || prompt < 0 || completion < 0)
      return { priced: false, reason: '用量不完整' };
    if (!spec || routes[spec.provider] !== routeHost(spec.base || ''))
      return { priced: false, reason: '接口来源未匹配官方价格' };
    const entry = rates[spec.provider + '|' + String(spec.model || '').toLowerCase()];
    if (!entry) return { priced: false, reason: '模型价格未收录' };
    const cachedValue = usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens != null
      ? usage.prompt_tokens_details.cached_tokens : usage.prompt_cache_hit_tokens;
    const rawCached = cachedValue == null ? null : Number(cachedValue);
    const cached = !estimated && Number.isFinite(rawCached) && rawCached >= 0 && rawCached <= prompt ? rawCached : null;
    const totalFor = (r, hit) => ((prompt - hit) * r[0] + hit * r[1] + completion * r[2]) / 1e6;
    const lowRates = entry.off || (entry.tiers.find(t => prompt <= t[0]) || []).slice(1);
    const highRates = entry.peak || lowRates;
    if (lowRates.length !== 3) return { priced: false, reason: '输入长度超出价格表范围' };
    return {
      priced: true,
      min: totalFor(lowRates, cached == null ? prompt : cached),
      max: totalFor(highRates, cached == null ? 0 : cached),
      cacheKnown: cached != null,
      timeRange: !!entry.peak,
      estimated: !!estimated,
      source: sources[spec.provider]
    };
  }
  const api = { usageQuote, routeHost, sources };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WerewolfPricing = api;
})(typeof window !== 'undefined' ? window : globalThis);
