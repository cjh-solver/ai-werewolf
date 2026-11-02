let speechFilterSeat = null;
let feedKind = 'all';

const PROVIDER_ICONS = Object.freeze({
  deepseek: 'deepseek-color.svg',
  doubao: 'doubao-color.svg',
  qwen: 'qwen-color.svg',
  hunyuan: 'hunyuan-color.svg',
  kimi: 'kimi-color.svg',
  zhipu: 'chatglm-color.svg',
  ollama: 'ollama.svg'
});

function providerIcon(provider) {
  const file = Object.prototype.hasOwnProperty.call(PROVIDER_ICONS, provider) ? PROVIDER_ICONS[provider] : '';
  return file
    ? '<span class="arena-model-mark' + (provider === 'ollama' || provider === 'kimi' ? ' arena-model-mark-light' : '') + '"><img src="assets/provider-logos/' + file + '" alt=""></span>'
    : '<span class="arena-model-mark arena-model-mark-generic" aria-hidden="true">AI</span>';
}

function isPublicSpeaker(seat) {
  return !!S && S.speaking === seat && !(S.phase === 'night' && secretsHidden());
}

function updateRuleSummary() {
  const target = $('ruleSummary');
  if (!target) return;
  const count = Number($('boardSel').value) || 9;
  target.textContent = '本局规则：' + (count === 6 ? '狼人数量追平好人获胜' : '屠边') +
    ' · 警长' + ($('sheriffOn').checked ? '开启' : '关闭') +
    (count === 12 ? ' · 同守同救' + ($('saveStackOn').checked ? '平安' : '奶穿') : '') +
    ' · 平票进入 PK，再平票无人出局';
}

function applySpeechFilter(node) {
  if (!node) return;
  const speech = node.classList.contains('speech');
  const wrongSeat = speechFilterSeat != null && !(speech && Number(node.dataset.seat) === speechFilterSeat);
  const wrongKind = (feedKind === 'speech' && !speech) || (feedKind === 'event' && speech);
  node.hidden = wrongSeat || wrongKind;
}

function setFeedKind(kind) {
  feedKind = ['all', 'speech', 'event'].includes(kind) ? kind : 'all';
  const feed = $('feedInner');
  if (feed) feed.querySelectorAll('.msg').forEach(applySpeechFilter);
  document.querySelectorAll('[data-feed-kind]').forEach(button => {
    const selected = button.dataset.feedKind === feedKind;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function setSpeechFilter(seat) {
  speechFilterSeat = seat == null ? null : Number(seat);
  if (speechFilterSeat != null && feedKind === 'event') setFeedKind('speech');
  const feed = $('feedInner');
  if (feed) feed.querySelectorAll('.msg').forEach(applySpeechFilter);
  const bar = $('feedFilter');
  if (bar) bar.hidden = speechFilterSeat == null;
  const label = $('feedFilterLabel');
  if (label) label.textContent = speechFilterSeat == null ? '' : speechFilterSeat + ' 号 · 发言';
}

function renderArenaOverview() {
  const target = $('arenaContent');
  if (!target || !S || !Array.isArray(S.seats)) return;
  const hideNightAction = S.phase === 'night' && secretsHidden();
  const active = hideNightAction ? null : S.seats.find(s => s.seat === S.speaking);
  const lastVote = [...(S.log || [])].reverse().find(item => item.kind === 'vote');
  const votes = lastVote && Array.isArray(lastVote.picks) ? lastVote.picks : [];
  const voteRows = votes.map(v => '<div class="intel-ballot" aria-label="' + esc(String(v.from)) + (v.to == null ? ' 号弃票' : ' 号投给 ' + esc(String(v.to)) + ' 号') + '"><span class="intel-ballot-seat">' + esc(String(v.from)) + '</span>' +
    '<span class="intel-ballot-arrow" aria-hidden="true">➝</span><b>' +
    (v.to == null ? '弃票' : esc(String(v.to)) + ' 号') + '</b></div>').join('');
  const groups = new Map();
  S.seats.filter(s => !s.human && s.spec).forEach(s => {
    const label = specLabel(s.spec);
    const group = groups.get(label) || { provider: s.spec.provider, total: 0, alive: 0 };
    group.total++;
    if (s.alive) group.alive++;
    groups.set(label, group);
  });
  const modelRows = [...groups].map(([label, group]) => {
    const segments = Array.from({ length: group.total }, (_, i) => '<i' + (i < group.alive ? ' class="alive"' : '') + '></i>').join('');
    return '<div class="arena-model-row"><div class="intel-model-line"><span class="arena-model-label">' + providerIcon(group.provider) + '<span class="arena-model" title="' + esc(label) + '">' +
      esc(label) + '</span></span><b>' + group.alive + '<span> / ' + group.total + '</span></b></div>' +
      '<div class="intel-model-segments" aria-hidden="true">' + segments + '</div></div>';
  }).join('');
  const declared = new Map();
  (S.log || []).filter(item => item.kind === 'speech' && item.round === S.round).forEach(item => {
    const match = String(item.text || '').match(/【票向\s*(\d{1,2})\s*号?】/);
    if (match) declared.set(item.seat, Number(match[1]));
  });
  const declaredRows = [...declared].map(([from, to]) => '<div class="intel-ballot" aria-label="' + esc(String(from)) + ' 号表达倾向 ' + esc(String(to)) + ' 号"><span class="intel-ballot-seat">' +
    esc(String(from)) + '</span><span class="intel-ballot-arrow" aria-hidden="true">➝</span><b>' + esc(String(to)) + ' 号</b></div>').join('');
  const events = (S.modelEvents || []).filter(event => !secretsHidden() || event.phase !== 'night');
  const responses = events.filter(event => event.kind === 'response');
  const swaps = responses.filter(event => event.original && event.actual && event.original !== event.actual).length;
  const retries = events.filter(event => event.kind === 'retry').length;
  const activeResponse = active ? [...responses].reverse().find(event => event.seat === active.seat && event.round === S.round && event.phase === S.phase) : null;
  const status = hideNightAction ? '夜间行动中' : ($('statusText') ? $('statusText').textContent : '');
  const phase = S.phase === 'night' ? '夜晚' : S.phase === 'day' ? '白天' : '准备';
  const portrait = active ? '<span class="intel-portrait">' + avatarSVG(active.avatar, 52) + '<i>' + esc(String(active.seat)) + '</i></span>' :
    '<span class="intel-portrait intel-portrait-empty" aria-hidden="true">✦</span>';
  target.innerHTML = '<section class="intel-focus"><div class="intel-focus-top"><span>此刻 · ' + phase + '</span><span class="intel-focus-rule" aria-hidden="true"></span><span>第 ' + esc(String(S.round || 1)) + (S.phase === 'night' ? ' 夜' : ' 天') + '</span></div>' +
    '<div class="intel-focus-main">' + portrait + '<div class="intel-focus-copy"><div class="intel-focus-caption">' + (active ? (S.phase === 'night' ? '当前行动' : '正在发言') : '当前场况') + '</div><div class="arena-current">' +
    (active ? esc(active.seat + ' 号 · ' + active.name) : esc(status || '等待下一阶段')) + '</div>' +
    '<div class="arena-detail">' + (active ? (activeResponse ? '实际响应：' + esc(activeResponse.actual) : '座位模型：' + esc(seatModelShort(active))) : '等待下一段故事') + '</div></div></div></section>' +
    '<section class="intel-section"><div class="intel-section-head"><span class="intel-seal" aria-hidden="true">Ⅰ</span><div><b>议事风向</b><small>公开发言中的票向</small></div><span class="intel-section-tag">本轮</span></div>' +
    (declaredRows ? '<div class="intel-ballots">' + declaredRows + '</div>' : '<div class="intel-empty">尚无明确票向标记</div>') +
    '<div class="intel-footnote">发言倾向可能与正式投票不同</div></section>' +
    '<section class="intel-section"><div class="intel-section-head"><span class="intel-seal" aria-hidden="true">Ⅱ</span><div><b>公示票卷</b><small>最近一次公开投票</small></div><span class="intel-section-tag">' +
    (lastVote ? '第 ' + esc(String(lastVote.round)) + ' 天' + (lastVote.pk ? ' · PK' : '') : '待公示') + '</span></div>' +
    (voteRows ? '<div class="intel-ballots">' + voteRows + '</div>' : '<div class="intel-empty">投票结束后公布票型</div>') + '</section>' +
    '<section class="intel-section intel-models"><div class="intel-section-head"><span class="intel-seal" aria-hidden="true">Ⅲ</span><div><b>模型阵容</b><small>开局席位 · 存活 / 总数</small></div><span class="intel-section-tag">' + groups.size + ' 组</span></div>' +
    (modelRows || '<div class="intel-empty">等待玩家入座</div>') +
    '<div class="intel-call-summary"><span>公开响应 <b>' + responses.length + '</b></span><span>重试 <b>' + retries + '</b></span><span>替补 <b>' + swaps + '</b></span></div></section>';
}


function renderTable() {
  const box = $('roundTable');
  if (!box || !S) return;
  const n = S.seats.length;
  if (!n) return;

  // 重建前把当前气泡记下来，重建完还原——否则每次刷新座位都会把正在说的话弄没
  const keepSeat = bubbleSeat;
  const keepText = bubbleText;
  const keepTag = bubbleTag;

  const rx = 39;   // 横向半径（百分比）
  const ry = 41;   // 纵向半径
  const phaseTxt = S.phase === 'night' ? '夜晚' : S.phase === 'day' ? '白天' : '准备中';
  const alive = S.seats.filter(s => s.alive).length;
  /* 身份要不要摆在台面上：上帝视角、观战、或本人自己的牌。
     参与模式且还活着时不显示别人的底牌——那是开挂。 */
  const showRole = !!S.revealed || !secretsHidden();
  const campOf = r => {
    const m = ROLE_META[r];
    if (!m) return '';
    return m.camp === 'wolf' ? 'wolf' : m.camp === 'god' ? 'god' : 'villager';
  };

  let html = '<div class="rt-wrap"><div class="rt-table">' +
    '<svg class="rt-ornament" viewBox="0 0 200 200" aria-hidden="true">' +
      '<circle cx="100" cy="100" r="76"/><circle cx="100" cy="100" r="67"/>' +
      '<path d="M100 11 110 63 100 55 90 63ZM100 189 110 137 100 145 90 137ZM11 100 63 90 55 100 63 110ZM189 100 137 90 145 100 137 110Z"/>' +
      '<path d="M100 42 158 100 100 158 42 100Z M100 54 146 100 100 146 54 100Z"/>' +
      '<path d="m72 70-9-21 24 17h26l24-17-9 21 8 19-10 4-4 18-22 22-22-22-4-18-10-4 8-19Zm8 24 13 5m27-5-13 5m-17 14h20l-10 9Z"/>' +
    '</svg>' +
    '<div class="rt-center"><b>第 ' + S.round + ' 天</b>' +
      '<span>' + phaseTxt + ' · 存活 ' + alive + '/' + n + '</span></div>';

  S.seats.forEach((s, i) => {
    // 1 号在 12 点方向，顺时针排；发言顺序也是顺时针，看着像一圈传话
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const x = 50 + Math.cos(ang) * rx;
    const y = 50 + Math.sin(ang) * ry;
    const cls = ['rt-seat'];
    if (!s.alive) cls.push('dead');
    if (isPublicSpeaker(s.seat)) cls.push('speaking');
    if (s.human) cls.push('me');
    const meta = ROLE_META[s.role] || { name: '', color: '#8b93a5' };
    const mine = s.human && MODE === 'play';
    /* 阵营不能只靠 CSS 藏。data-camp="wolf" 写在座位上就是一个现成的
       选择器，DevTools 里一眼看出谁是狼——所以身份没公开时不写这个属性。 */
    const campAttr = (showRole || mine) ? campOf(s.role) : '';
    const roleLine = (showRole || mine) && meta.name
      ? '<div class="rt-role" data-camp="' + campOf(s.role) + '" style="color:' + meta.color + '">' +
          '<i class="rt-camp-dot"></i>' + meta.name + '</div>'
      : '';
    html += '<div class="' + cls.join(' ') + '" role="button" tabindex="0" aria-label="查看 ' + s.seat + ' 号 ' + esc(s.name) + ' 的档案" data-seat="' + s.seat + '" data-rt="' + s.seat + '"' +
      (campAttr ? ' data-camp="' + campAttr + '"' : '') +
      ' style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%">' +
      '<div class="rt-ava">' + avatarSVG(s.avatar, 54) +
        '<span class="rt-no">' + s.seat + '</span>' +
        (S.sheriff === s.seat && s.alive ? '<span class="rt-sheriff" title="警长" aria-label="警长" role="img"></span>' : '') +
      '</div>' +
      '<div class="rt-name">' + esc(s.name) +
        (s.human ? '<i class="rt-model">真人</i>'
                 : '<i class="rt-model" title="' + esc(specLabel(s.spec)) + '">' + esc(modelShort(s.spec)) + '</i>') +
      '</div>' +
      roleLine +
    '</div>';
  });

  html += '</div></div>';
  box.innerHTML = html;
  box.querySelectorAll('.rt-seat').forEach(el => {
    el.addEventListener('click', () => openProfile(Number(el.dataset.seat)));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfile(Number(el.dataset.seat)); }
    });
  });
  bubbleEl = null;
  if (keepSeat != null) {
    const who = seatOf(keepSeat);
    if (who) {
      const b = openBubble(who, keepTag);
      if (keepText) b.set(keepText);
    }
  }
  drawVoteArrows();
}

