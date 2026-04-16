const ONTTER_URL = 'https://www.ontter.com';
const state = {
  config: null,
  results: null,
  flow: [],
  current: 0,
  answers: {},
  bonusGroup: null,
  bonusEnabled: false,
  finalSummary: null
};

const els = {
  startView: document.getElementById('startView'),
  quizView: document.getElementById('quizView'),
  resultView: document.getElementById('resultView'),
  startBtn: document.getElementById('startBtn'),
  backBtn: document.getElementById('backBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  restartBtn: document.getElementById('restartBtn'),
  copyBtn: document.getElementById('copyBtn'),
  progressText: document.getElementById('progressText'),
  progressPercent: document.getElementById('progressPercent'),
  progressInner: document.getElementById('progressInner'),
  questionMode: document.getElementById('questionMode'),
  questionNumber: document.getElementById('questionNumber'),
  questionText: document.getElementById('questionText'),
  questionHint: document.getElementById('questionHint'),
  options: document.getElementById('options'),
  resultBadge: document.getElementById('resultBadge'),
  resultTitle: document.getElementById('resultTitle'),
  resultSubtitle: document.getElementById('resultSubtitle'),
  resultMatch: document.getElementById('resultMatch'),
  verdictText: document.getElementById('verdictText'),
  traitsList: document.getElementById('traitsList'),
  noteText: document.getElementById('noteText'),
  tipText: document.getElementById('tipText'),
  archiveCard: document.getElementById('archiveCard'),
  primaryArchive: document.getElementById('primaryArchive'),
  secondaryArchive: document.getElementById('secondaryArchive'),
  directionArchive: document.getElementById('directionArchive')
};

async function init() {
  const [qRes, rRes] = await Promise.all([
    fetch('./data/questions.json'),
    fetch('./data/results.json')
  ]);
  state.config = await qRes.json();
  state.results = await rRes.json();
  bindEvents();
}

function bindEvents() {
  els.startBtn.addEventListener('click', startQuiz);
  els.backBtn.addEventListener('click', showStart);
  els.prevBtn.addEventListener('click', previousQuestion);
  els.nextBtn.addEventListener('click', nextQuestion);
  els.restartBtn.addEventListener('click', startQuiz);
  els.copyBtn.addEventListener('click', copyResultText);
}

function showStart() {
  els.startView.classList.remove('hidden');
  els.quizView.classList.add('hidden');
  els.resultView.classList.add('hidden');
}

function startQuiz() {
  state.flow = [...state.config.directionQuestions, ...state.config.typeQuestions];
  state.current = 0;
  state.answers = {};
  state.bonusGroup = null;
  state.bonusEnabled = false;
  state.finalSummary = null;
  els.startView.classList.add('hidden');
  els.resultView.classList.add('hidden');
  els.quizView.classList.remove('hidden');
  renderQuestion();
}

function renderQuestion() {
  const q = state.flow[state.current];
  const progress = ((state.current + 1) / state.flow.length) * 100;
  els.progressText.textContent = `第 ${state.current + 1} / ${state.flow.length} 题`;
  els.progressPercent.textContent = `${Math.round(progress)}%`;
  els.progressInner.style.width = `${progress}%`;
  els.questionNumber.textContent = `${q.id}`;
  els.questionText.textContent = q.text;
  els.questionHint.textContent = state.current < 4
    ? '没有完全符合的选项。默认选最像你在股市发病时的反应。'
    : state.bonusEnabled
      ? '系统判断你的人格有点打架，所以补你 2 题做最后裁决。'
      : '没有完全符合的选项。默认选最像你在股市发病时的反应。';

  if (state.bonusEnabled) {
    els.questionMode.textContent = `补题模式｜${state.results.groupLabels[state.bonusGroup]}裁决中`;
    els.questionMode.classList.remove('hidden');
  } else if (state.current < 4) {
    els.questionMode.textContent = '破冰题｜先抓你是哪种大方向';
    els.questionMode.classList.remove('hidden');
  } else {
    els.questionMode.textContent = '核心题｜开始映射主类型';
    els.questionMode.classList.remove('hidden');
  }

  els.options.innerHTML = '';
  q.options.forEach((option, optionIndex) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.type = 'button';
    if (state.answers[q.id] === optionIndex) btn.classList.add('selected');
    btn.innerHTML = `<span class="option-label">${option.label}</span><span class="option-text">${option.text}</span>`;
    btn.addEventListener('click', () => {
      state.answers[q.id] = optionIndex;
      renderQuestion();
    });
    els.options.appendChild(btn);
  });

  els.prevBtn.disabled = state.current === 0;
  const hasAnswer = state.answers[q.id] !== undefined;
  els.nextBtn.disabled = !hasAnswer;
  els.nextBtn.textContent = state.current === state.flow.length - 1 ? '提交并接受市场审判' : '下一题';
}

function previousQuestion() {
  if (state.current > 0) {
    state.current -= 1;
    renderQuestion();
  }
}

function nextQuestion() {
  const q = state.flow[state.current];
  if (state.answers[q.id] === undefined) return;

  if (state.current < state.flow.length - 1) {
    state.current += 1;
    renderQuestion();
    return;
  }

  if (!state.bonusEnabled) {
    const analysis = analyzeBaseAnswers();
    if (analysis.needBonus) {
      state.bonusEnabled = true;
      state.bonusGroup = analysis.bonusGroup;
      state.flow = [...state.flow, ...state.config.bonusQuestions[state.bonusGroup]];
      state.current += 1;
      renderQuestion();
      return;
    }
    state.finalSummary = finalizeResult(analysis, null);
  } else {
    const analysis = analyzeBaseAnswers();
    const bonusAnswers = getBonusTypeTallies();
    state.finalSummary = finalizeResult(analysis, bonusAnswers);
  }

  showResult();
}

function getAnswerPayload(question) {
  const answerIndex = state.answers[question.id];
  return question.options[answerIndex];
}

function analyzeBaseAnswers() {
  const directionScores = { hot: 0, obsession: 0, cool: 0 };
  const typeScores = {};
  Object.values(state.config.groupMap).flat().forEach(code => { typeScores[code] = 0; });

  state.config.directionQuestions.forEach(q => {
    const payload = getAnswerPayload(q);
    directionScores[payload.group] += 1;
  });

  state.config.typeQuestions.forEach(q => {
    const payload = getAnswerPayload(q);
    typeScores[payload.type] += 1;
  });

  const typeRanking = Object.entries(typeScores).sort((a,b) => b[1] - a[1]);
  const [primaryCode, primaryScore] = typeRanking[0];
  const [secondaryCode, secondaryScore] = typeRanking[1];
  const dominantDirection = breakDirectionTie(directionScores);
  const primaryGroup = getGroupByType(primaryCode);
  const scoreGap = primaryScore - secondaryScore;
  const directionConflict = dominantDirection !== primaryGroup;
  const needBonus = scoreGap <= 1 || directionConflict;

  let bonusGroup = null;
  if (needBonus) {
    bonusGroup = inferBonusGroup(typeScores, dominantDirection, primaryCode, secondaryCode, directionConflict);
  }

  return { directionScores, typeScores, typeRanking, primaryCode, secondaryCode, primaryScore, secondaryScore, dominantDirection, directionConflict, needBonus, bonusGroup };
}

function breakDirectionTie(directionScores) {
  const entries = Object.entries(directionScores).sort((a,b) => b[1] - a[1]);
  if (entries[0][1] !== entries[1][1]) return entries[0][0];
  const firstFour = state.config.directionQuestions.map(q => getAnswerPayload(q).group);
  return firstFour.reverse().find(g => entries.some(([group, score]) => group === g && score === entries[0][1])) || entries[0][0];
}

function getGroupByType(code) {
  return Object.entries(state.config.groupMap).find(([, list]) => list.includes(code))[0];
}

function inferBonusGroup(typeScores, dominantDirection, primaryCode, secondaryCode, directionConflict) {
  const maxScore = Math.max(...Object.values(typeScores));
  const nearTop = Object.entries(typeScores).filter(([, score]) => maxScore - score <= 1).map(([code]) => code);
  const groupCounts = { hot: 0, obsession: 0, cool: 0 };
  nearTop.forEach(code => { groupCounts[getGroupByType(code)] += 1; });
  const sortedGroups = Object.entries(groupCounts).sort((a,b) => b[1] - a[1]);
  if (sortedGroups[0][1] > 0 && sortedGroups[0][1] !== sortedGroups[1][1]) return sortedGroups[0][0];
  if (getGroupByType(primaryCode) === getGroupByType(secondaryCode)) return getGroupByType(primaryCode);
  if (directionConflict) return dominantDirection;
  return getGroupByType(primaryCode);
}

function getBonusTypeTallies() {
  if (!state.bonusEnabled || !state.bonusGroup) return null;
  const tally = {};
  state.config.groupMap[state.bonusGroup].forEach(code => { tally[code] = 0; });
  state.config.bonusQuestions[state.bonusGroup].forEach(q => {
    const payload = getAnswerPayload(q);
    tally[payload.type] += 1;
  });
  return tally;
}

function detectHidden(finalPrimary, finalSecondary, dominantDirection) {
  const coolPair = ['JZ', 'FX', 'DL'];
  const hotPair = ['RJ', 'XZ', 'MC'];
  const primarySecondary = [finalPrimary, finalSecondary];
  if (dominantDirection === 'cool' && primarySecondary.every(code => coolPair.includes(code))) {
    return 'clarity_card';
  }
  if (dominantDirection === 'hot' && primarySecondary.every(code => hotPair.includes(code))) {
    return 'bull_market_only';
  }
  if (dominantDirection === 'obsession' && ['JZ','FX'].includes(finalPrimary)) {
    return 'empty_position_immortal';
  }
  return null;
}

function finalizeResult(analysis, bonusTallies) {
  const { typeScores, primaryCode, secondaryCode, dominantDirection, bonusGroup } = analysis;
  let finalPrimary = primaryCode;

  if (bonusTallies && bonusGroup) {
    const candidates = state.config.groupMap[bonusGroup];
    const sorted = candidates.sort((a, b) => {
      if ((bonusTallies[b] || 0) !== (bonusTallies[a] || 0)) return (bonusTallies[b] || 0) - (bonusTallies[a] || 0);
      if (typeScores[b] !== typeScores[a]) return typeScores[b] - typeScores[a];
      return a.localeCompare(b);
    });
    finalPrimary = sorted[0];
  }

  const remaining = Object.entries(typeScores)
    .filter(([code]) => code !== finalPrimary)
    .sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const finalSecondary = remaining[0][0];
  const hiddenKey = detectHidden(finalPrimary, finalSecondary, dominantDirection);
  const matchRate = buildMatchRate();

  return {
    finalPrimary,
    finalSecondary,
    dominantDirection,
    hiddenKey,
    matchRate
  };
}

function buildMatchRate() {
  const seed = Object.values(state.answers).join('-');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return 78 + Math.abs(hash % 19);
}

function showResult() {
  const { finalPrimary, finalSecondary, dominantDirection, hiddenKey, matchRate } = state.finalSummary;
  const resultPayload = hiddenKey ? state.results.hidden[hiddenKey] : state.results.primaries[finalPrimary];

  els.resultBadge.textContent = resultPayload.emoji || '📊';
  els.resultTitle.textContent = hiddenKey ? `隐藏档案已解锁` : `你的主类型`;
  els.resultSubtitle.textContent = `${resultPayload.title}｜${resultPayload.subtitle}`;
  els.resultMatch.textContent = `匹配度：${matchRate}%`;
  els.verdictText.textContent = resultPayload.verdict;
  els.noteText.textContent = resultPayload.note;
  els.tipText.textContent = resultPayload.tip;
  els.traitsList.innerHTML = '';
  resultPayload.traits.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    els.traitsList.appendChild(li);
  });

  els.archiveCard.classList.remove('hidden');
  els.primaryArchive.textContent = `${state.results.primaries[finalPrimary].title}｜${state.results.primaries[finalPrimary].subtitle}`;
  els.secondaryArchive.textContent = `${state.results.primaries[finalSecondary].title}｜${state.results.primaries[finalSecondary].subtitle}`;
  els.directionArchive.textContent = state.results.groupLabels[dominantDirection];

  els.quizView.classList.add('hidden');
  els.resultView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function copyResultText() {
  if (!state.finalSummary) return;
  const { finalPrimary, finalSecondary, hiddenKey, dominantDirection, matchRate } = state.finalSummary;
  const result = hiddenKey ? state.results.hidden[hiddenKey] : state.results.primaries[finalPrimary];

  const lines = [
    'ONTI｜Operation News Trading Indicator（由 Ontter 团队制作）',
    hiddenKey ? `隐藏档案：${result.title}｜${result.subtitle}` : `主类型：${result.title}｜${result.subtitle}`,
    `副类型：${state.results.primaries[finalSecondary].title}`,
    `大方向：${state.results.groupLabels[dominantDirection]}`,
    `匹配度：${matchRate}%`,
    result.verdict,
    '',
    '系统备注：',
    result.note,
    '',
    '友情提示：',
    result.tip,
    '',
    `本测试由 Ontter 团队制作，仅供娱乐与自我观察，不构成投资建议，不负责回本。`,
    `了解更多： ${ONTTER_URL}`
  ];

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    els.copyBtn.textContent = '已复制';
    setTimeout(() => { els.copyBtn.textContent = '复制结果文案'; }, 1500);
  } catch {
    els.copyBtn.textContent = '复制失败';
    setTimeout(() => { els.copyBtn.textContent = '复制结果文案'; }, 1500);
  }
}

init().catch(err => {
  console.error(err);
  alert('页面初始化失败，请确认静态资源路径正确。');
});
