(() => {
  const WORLDCUP_DATA_URL = '/static/data/worldcup_items.json';
  const MINIGAME_ASSET_BASE_URL = '/static/images/minigames';
  const WORLDCUP_SIZE = 16;
  const STORAGE_KEY = `wlighter:minigames:worldcup:${window.location.pathname}`;
  const BALANCE_STORAGE_KEY = `wlighter:minigames:balance:${window.location.pathname}`;
  const BALANCE_QUESTIONS = [
    {
      question: '로맨스 판타지 주인공이라면',
      options: [
        { key: 'A', text: '냉혈한 북부대공과 계약결혼', scores: { cold: 2, angst: 1 } },
        { key: 'B', text: '집착 황태자의 첫사랑', scores: { intense: 2, romance: 1 } },
      ],
    },
    {
      question: '더 끌리는 캐릭터는?',
      options: [
        { key: 'A', text: '먼치킨인데 성격 더러움', scores: { power: 2, cold: 1 } },
        { key: 'B', text: '약하지만 머리 좋음', scores: { strategy: 2, growth: 1 } },
      ],
    },
    {
      question: '주인공 성장 방식은',
      options: [
        { key: 'A', text: '처음부터 강한 먼치킨', scores: { power: 2 } },
        { key: 'B', text: '밑바닥부터 성장하는 노력형', scores: { growth: 2, strategy: 1 } },
      ],
    },
    {
      question: '더 좋은 주인공은?',
      options: [
        { key: 'A', text: '착한데 답답함', scores: { sweet: 2 } },
        { key: 'B', text: '냉정한데 유능함', scores: { cold: 2, strategy: 1 } },
      ],
    },
    {
      question: '남주 취향은?',
      options: [
        { key: 'A', text: '냉정하지만 여주에게만 다정한 남주', scores: { cold: 1, romance: 2 } },
        { key: 'B', text: '처음부터 직진하는 다정남', scores: { sweet: 2, romance: 1 } },
      ],
    },
    {
      question: '로판 클리셰 중 하나만 고른다면',
      options: [
        { key: 'A', text: '계약결혼', scores: { strategy: 1, romance: 1 } },
        { key: 'B', text: '후회남', scores: { angst: 2, intense: 1 } },
      ],
    },
    {
      question: '집착 캐릭터라면',
      options: [
        { key: 'A', text: '말은 차갑지만 행동은 챙김', scores: { cold: 1, romance: 1 } },
        { key: 'B', text: '대놓고 소유욕 폭발', scores: { intense: 2, angst: 1 } },
      ],
    },
    {
      question: '여주와 남주의 관계는',
      options: [
        { key: 'A', text: '여주가 남주를 구원', scores: { sweet: 1, romance: 1 } },
        { key: 'B', text: '남주가 여주를 구원', scores: { angst: 1, romance: 1 } },
      ],
    },
    {
      question: '작품 분위기는',
      options: [
        { key: 'A', text: '가볍고 웃긴 개그물', scores: { comedy: 2, sweet: 1 } },
        { key: 'B', text: '무겁고 몰입감 있는 피폐물', scores: { angst: 2, cold: 1 } },
      ],
    },
    {
      question: '더 선호하는 결말은?',
      options: [
        { key: 'A', text: '완벽한 해피엔딩', scores: { happy: 2, sweet: 1 } },
        { key: 'B', text: '여운 남는 열린 결말', scores: { angst: 1, strategy: 1 } },
      ],
    },
    {
      question: '더 참기 힘든 것은?',
      options: [
        { key: 'A', text: '고구마 전개 20화', scores: { happy: 1, power: 1 } },
        { key: 'B', text: '개연성 없는 사이다 1화', scores: { strategy: 2 } },
      ],
    },
    {
      question: '더 막막한 시작은?',
      options: [
        { key: 'A', text: '처형 하루 전 악녀에 빙의', scores: { angst: 2, strategy: 1 } },
        { key: 'B', text: '파산 직전 가문 후계자로 환생', scores: { growth: 2, strategy: 1 } },
      ],
    },
    {
      question: '내가 웹소설 주인공이라면 더 싫은 상황은?',
      options: [
        { key: 'A', text: '회귀했는데 기억이 애매함', scores: { strategy: 1, angst: 1 } },
        { key: 'B', text: '빙의했는데 원작을 안 읽음', scores: { comedy: 1, growth: 1 } },
      ],
    },
    {
      question: '하루만 함께 일하고 싶은 사람은?',
      options: [
        { key: 'A', text: '폭군 황제의 비서', scores: { cold: 1, strategy: 2 } },
        { key: 'B', text: '마탑주의 실험 조수', scores: { comedy: 1, power: 1 } },
      ],
    },
  ];
  const BALANCE_RESULTS = [
    {
      id: 'cold_angst',
      title: '냉정유능 피폐물입파',
      description: '냉정하고 유능한 캐릭터, 무거운 감정선, 구원 서사에 끌리는 타입이에요. 가볍게 즐기기보다 깊이 몰입해서 감정을 따라가는 이야기를 선호해요.',
      tags: ['냉정유능', '피폐물', '구원서사', '후회남'],
      score: scores => (scores.cold || 0) + (scores.angst || 0) + (scores.intense || 0),
    },
    {
      id: 'sweet_happy',
      title: '직진다정 해피엔딩파',
      description: '따뜻한 관계와 확실한 애정 표현을 좋아하는 타입이에요. 감정 소모가 크기보다 끝까지 안정적으로 행복해지는 서사를 선호해요.',
      tags: ['직진남', '다정남', '해피엔딩', '순정'],
      score: scores => (scores.sweet || 0) + (scores.happy || 0) + (scores.romance || 0),
    },
    {
      id: 'power_growth',
      title: '먼치킨 성장서사파',
      description: '강해지는 과정과 시원한 해결을 좋아하는 타입이에요. 주인공이 능력을 증명하고 판을 뒤집는 전개에서 가장 큰 재미를 느껴요.',
      tags: ['먼치킨', '성장물', '사이다', '능력자'],
      score: scores => (scores.power || 0) + (scores.growth || 0) + Math.floor((scores.happy || 0) / 2),
    },
    {
      id: 'strategy_comedy',
      title: '계략생존 두뇌파',
      description: '힘보다 머리로 위기를 돌파하는 캐릭터에 끌리는 타입이에요. 예측 가능한 전개보다 기발한 선택과 반전이 있는 이야기를 선호해요.',
      tags: ['계략', '두뇌파', '생존물', '반전'],
      score: scores => (scores.strategy || 0) + (scores.comedy || 0) + Math.floor((scores.growth || 0) / 2),
    },
  ];

  const gameRegistry = new Map();
  let backdrop = null;
  let translationDoneNotice = null;
  let worldcupItemsPromise = null;
  let worldcupState = null;
  let balanceState = null;

  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (textContent !== undefined) element.textContent = textContent;
    return element;
  }

  function ensureBackdrop() {
    if (backdrop) return backdrop;

    backdrop = createElement('div', 'mg-backdrop');
    backdrop.id = 'minigameBackdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function buildTranslationDoneNotice() {
    const notice = createElement('div', 'mg-translation-done');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');

    const message = createElement('span', 'mg-translation-done-message', '✤ 번역이 완료되었어요!');
    const action = createElement('button', 'mg-translation-done-action');
    action.type = 'button';
    const actionText = createElement('span', 'mg-translation-done-action-text', '번역본 확인하기');
    const actionIcon = createElement('img', 'mg-translation-done-action-icon');
    actionIcon.src = `${MINIGAME_ASSET_BASE_URL}/arrow_right.svg`;
    actionIcon.alt = '';
    actionIcon.setAttribute('aria-hidden', 'true');
    action.append(actionText, actionIcon);
    action.addEventListener('click', () => {
      closeBackdrop();
      activateTranslationTab();
      document.dispatchEvent(new CustomEvent('translation:done-confirmed'));
    });

    notice.append(message, action);
    return notice;
  }

  function showTranslationDoneNotice() {
    ensureBackdrop();
    if (!translationDoneNotice) {
      translationDoneNotice = buildTranslationDoneNotice();
    }
    if (!translationDoneNotice.isConnected) {
      backdrop.appendChild(translationDoneNotice);
    }
    translationDoneNotice.classList.add('open');
  }

  function hideTranslationDoneNotice() {
    translationDoneNotice?.classList.remove('open');
    translationDoneNotice?.remove();
  }

  function openBackdrop() {
    ensureBackdrop();
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeBackdrop() {
    if (!backdrop) return;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.replaceChildren();
    hideTranslationDoneNotice();
    document.body.style.overflow = '';
  }

  function renderInBackdrop(panel) {
    ensureBackdrop();
    const noticeWasOpen = translationDoneNotice?.classList.contains('open');
    backdrop.replaceChildren(panel);
    if (noticeWasOpen) showTranslationDoneNotice();
  }

  function formatTag(tag) {
    return `#${String(tag || '').replace(/^#/, '')}`;
  }

  function getItemLabel(item) {
    return (item.tags || []).slice(0, 2).map(formatTag).join(' ');
  }

  function shuffleItems(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function getTournamentSize(itemCount) {
    const cappedCount = Math.min(WORLDCUP_SIZE, itemCount);
    let size = 1;
    while (size * 2 <= cappedCount) size *= 2;
    return size;
  }

  function normalizeWorldcupItems(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => item?.id && item?.image && Array.isArray(item?.tags));
  }

  async function fetchWorldcupItems() {
    if (!worldcupItemsPromise) {
      worldcupItemsPromise = fetch(WORLDCUP_DATA_URL, { cache: 'no-cache' })
        .then(response => {
          if (!response.ok) throw new Error('월드컵 데이터 파일을 불러오지 못했습니다.');
          return response.text();
        })
        .then(text => {
          return JSON.parse(text.replace(/^\uFEFF/, ''));
        })
        .then(normalizeWorldcupItems);
    }
    return worldcupItemsPromise;
  }

  function getRoundLabel(roundSize) {
    return roundSize === 2 ? '결승' : `${roundSize}강`;
  }

  function getRoundPairTotal(roundSize) {
    return Math.max(1, roundSize / 2);
  }

  function activateTranslationTab() {
    const translationTab = document.querySelector('.tr-tab[data-tab="translation"]');
    translationTab?.click();
  }

  function saveWorldcupResult(winner) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        winnerId: winner.id,
        tags: winner.tags,
        completedAt: new Date().toISOString(),
      }));
    } catch (error) {
      // sessionStorage를 사용할 수 없는 환경에서는 결과 저장만 건너뛴다.
    }
  }

  // 월드컵 이미지를 미리 받아 브라우저 캐시에 적재.
  // 게임은 '번역 중'에만 떠서, 라운드마다 새로 요청하면 번역으로 바쁜 서버가
  // 이미지 요청을 굶겨 빈 칸이 된다. 시작 시 한 번에 캐시해 두면 이후엔 요청이 없음.
  function preloadWorldcupImages(items) {
    (items || []).forEach((item) => {
      if (!item || !item.image) return;
      const pre = new Image();
      pre.src = item.image;
    });
  }

  const WORLDCUP_IMG_FALLBACK_SVG =
    '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3 3l18 18"/><path d="M21 15V5a2 2 0 0 0-2-2H7"/>' +
    '<path d="M3 7v12a2 2 0 0 0 2 2h12"/><path d="M3 16l5-5 3 3"/></svg>';

  function showWorldcupImageFallback(imageEl) {
    const wrap = imageEl.parentNode;
    if (!wrap) return;
    imageEl.remove();
    const fb = createElement('span', 'mg-worldcup-image-fallback');
    fb.innerHTML =
      '<span class="mg-worldcup-image-fallback-icon">' + WORLDCUP_IMG_FALLBACK_SVG + '</span>' +
      '<span class="mg-worldcup-image-fallback-text">삽화를 불러오지 못했어요</span>';
    wrap.appendChild(fb);
  }

  // 이미지 로드 실패 시 최대 2회 재시도, 그래도 안 되면 fallback 표시.
  function attachWorldcupImage(imageEl, src) {
    let attempts = 0;
    const MAX_RETRY = 2;
    imageEl.addEventListener('error', function onError() {
      if (attempts < MAX_RETRY) {
        attempts += 1;
        setTimeout(() => {
          imageEl.src = src + (src.indexOf('?') === -1 ? '?' : '&') + 'r=' + attempts;
        }, 400 * attempts);
      } else {
        imageEl.removeEventListener('error', onError);
        showWorldcupImageFallback(imageEl);
      }
    });
    imageEl.src = src;
  }

  function buildWorldcupCard(item) {
    const card = createElement('button', 'mg-worldcup-card');
    card.type = 'button';
    card.setAttribute('aria-label', `${getItemLabel(item)} 선택`);

    const imageWrap = createElement('span', 'mg-worldcup-image-wrap');
    const image = createElement('img', 'mg-worldcup-image');
    image.alt = `${getItemLabel(item)} 캐릭터`;
    image.loading = 'eager';
    attachWorldcupImage(image, item.image);
    imageWrap.appendChild(image);

    const tag = createElement('span', 'mg-worldcup-tag', getItemLabel(item));

    card.append(imageWrap, tag);
    card.addEventListener('click', () => selectWorldcupItem(item));
    return card;
  }

  function renderWorldcupMatch() {
    const { roundItems, currentPairIndex, roundSize } = worldcupState;
    const left = roundItems[currentPairIndex * 2];
    const right = roundItems[currentPairIndex * 2 + 1];
    if (!left || !right) return renderWorldcupResult(roundItems[0]);

    const modal = createElement('section', 'mg-modal mg-worldcup-panel');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'worldcupGameTitle');

    const title = createElement('h2', 'mg-worldcup-title', '번역 중이에요. 잠깐 이상형 월드컵 한 판!');
    title.id = 'worldcupGameTitle';

    const match = createElement('div', 'mg-worldcup-match');
    const center = createElement('div', 'mg-worldcup-center');
    const round = createElement('div', 'mg-worldcup-round');
    const roundName = createElement('span', 'mg-worldcup-round-name', getRoundLabel(roundSize));
    const roundProgress = createElement('span', 'mg-worldcup-round-progress', `${currentPairIndex + 1}/${getRoundPairTotal(roundSize)}`);
    const vs = createElement('div', 'mg-worldcup-vs', 'VS');
    round.append(roundName, roundProgress);
    center.append(round, vs);

    match.append(buildWorldcupCard(left), center, buildWorldcupCard(right));
    modal.append(title, match);
    renderInBackdrop(modal);

    modal.querySelector('.mg-worldcup-card')?.focus();
  }

  function selectWorldcupItem(item) {
    if (!worldcupState) return;

    worldcupState.nextRound.push(item);
    worldcupState.currentPairIndex += 1;

    const roundFinished = worldcupState.currentPairIndex >= worldcupState.roundItems.length / 2;
    if (!roundFinished) {
      renderWorldcupMatch();
      return;
    }

    if (worldcupState.nextRound.length === 1) {
      renderWorldcupResult(worldcupState.nextRound[0]);
      return;
    }

    worldcupState.roundItems = worldcupState.nextRound;
    worldcupState.roundSize = worldcupState.nextRound.length;
    worldcupState.nextRound = [];
    worldcupState.currentPairIndex = 0;
    renderWorldcupMatch();
  }

  function renderWorldcupResult(winner) {
    saveWorldcupResult(winner);
    hideTranslationDoneNotice();

    const modal = createElement('section', 'mg-modal mg-worldcup-result');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'worldcupResultTitle');

    const kicker = createElement('h2', 'mg-worldcup-result-kicker', '이상형 월드컵 우승!');
    kicker.id = 'worldcupResultTitle';
    const desc = createElement('p', 'mg-worldcup-result-desc', '최종 선택된 캐릭터예요.');
    const sparkles = createElement('div', 'mg-worldcup-sparkles');
    sparkles.setAttribute('aria-hidden', 'true');
    [
      'sparkle.svg',
      'sparkle_2.svg',
      'sparkle_white.svg',
      'sparkle_white_2.svg',
      'sparkle.svg',
      'sparkle_2.svg',
    ].forEach((fileName, index) => {
      const sparkle = createElement('img', 'mg-worldcup-sparkle');
      sparkle.src = `${MINIGAME_ASSET_BASE_URL}/${fileName}`;
      sparkle.alt = '';
      sparkle.dataset.sparkleIndex = String(index + 1);
      sparkles.appendChild(sparkle);
    });
    const crown = createElement('img', 'mg-worldcup-crown');
    crown.src = `${MINIGAME_ASSET_BASE_URL}/crown.svg`;
    crown.alt = '';
    crown.setAttribute('aria-hidden', 'true');

    const winnerCard = createElement('div', 'mg-worldcup-winner-card');
    const imageWrap = createElement('div', 'mg-worldcup-winner-image-wrap');
    const image = createElement('img', 'mg-worldcup-winner-image');
    image.alt = `${getItemLabel(winner)} 우승 캐릭터`;
    attachWorldcupImage(image, winner.image);
    const badge = createElement('span', 'mg-worldcup-winner-badge', 'WINNER');
    imageWrap.appendChild(image);
    winnerCard.append(imageWrap, badge);

    const tags = createElement('div', 'mg-worldcup-result-tags');
    winner.tags.forEach(tag => {
      tags.appendChild(createElement('span', 'mg-worldcup-result-tag', formatTag(tag)));
    });

    const action = createElement('button', 'mg-primary-action');
    action.type = 'button';
    const actionText = createElement('span', 'mg-primary-action-text', '번역본 확인하기');
    const actionIcon = createElement('img', 'mg-primary-action-icon');
    actionIcon.src = `${MINIGAME_ASSET_BASE_URL}/arrow_right.svg`;
    actionIcon.alt = '';
    actionIcon.setAttribute('aria-hidden', 'true');
    action.append(actionText, actionIcon);
    action.addEventListener('click', () => {
      closeBackdrop();
      activateTranslationTab();
      document.dispatchEvent(new CustomEvent('translation:minigame-complete', {
        detail: { game: 'worldcup', winner },
      }));
    });

    modal.append(sparkles, crown, kicker, desc, winnerCard, tags, action);
    renderInBackdrop(modal);
    action.focus();
  }

  function renderMinigameError(message) {
    const modal = createElement('section', 'mg-modal mg-error');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const title = createElement('h2', 'mg-error-title', '미니게임을 불러오지 못했어요.');
    const desc = createElement('p', 'mg-error-desc', message);
    const action = createElement('button', 'mg-primary-action');
    action.type = 'button';
    const actionText = createElement('span', 'mg-primary-action-text', '번역본 확인하기');
    const actionIcon = createElement('img', 'mg-primary-action-icon');
    actionIcon.src = `${MINIGAME_ASSET_BASE_URL}/arrow_right.svg`;
    actionIcon.alt = '';
    actionIcon.setAttribute('aria-hidden', 'true');
    action.append(actionText, actionIcon);
    action.addEventListener('click', () => {
      closeBackdrop();
      activateTranslationTab();
    });

    modal.append(title, desc, action);
    renderInBackdrop(modal);
    action.focus();
  }

  async function startWorldcup(translationDetail = {}) {
    openBackdrop();
    try {
      const items = await fetchWorldcupItems();
      const tournamentSize = getTournamentSize(items.length);
      if (tournamentSize < 2) {
        throw new Error('월드컵을 진행할 이미지 데이터가 부족합니다.');
      }

      worldcupState = {
        translationDetail,
        roundItems: shuffleItems(items).slice(0, tournamentSize),
        nextRound: [],
        currentPairIndex: 0,
        roundSize: tournamentSize,
      };
      // 토너먼트에 쓰일 이미지를 미리 캐시 → 라운드마다 재요청하지 않음
      preloadWorldcupImages(worldcupState.roundItems);
      renderWorldcupMatch();
    } catch (error) {
      renderMinigameError(error.message || '잠시 후 다시 시도해 주세요.');
    }
  }

  function applyScores(scores, optionScores) {
    Object.entries(optionScores || {}).forEach(([key, value]) => {
      scores[key] = (scores[key] || 0) + value;
    });
  }

  function buildBalanceOption(option, variant) {
    const card = createElement('button', `mg-balance-card mg-balance-card-${variant}`);
    card.type = 'button';
    card.setAttribute('aria-label', `${option.key}. ${option.text} 선택`);

    const mark = createElement('span', 'mg-balance-mark', option.key);
    const text = createElement('span', 'mg-balance-option-text', option.text);
    card.append(mark, text);
    card.addEventListener('click', () => selectBalanceOption(option));
    return card;
  }

  function buildBalanceProgress() {
    const progress = createElement('div', 'mg-balance-progress');
    const count = createElement('span', 'mg-balance-progress-count', `${balanceState.currentIndex + 1} / ${BALANCE_QUESTIONS.length}`);
    const pills = createElement('div', 'mg-balance-progress-pills');

    BALANCE_QUESTIONS.forEach((question, index) => {
      const pill = createElement('span', 'mg-balance-progress-pill');
      if (index <= balanceState.currentIndex) pill.classList.add('active');
      pills.appendChild(pill);
    });

    progress.append(count, pills);
    return progress;
  }

  function renderBalanceQuestion() {
    const question = BALANCE_QUESTIONS[balanceState.currentIndex];
    if (!question) return renderBalanceResult();

    const modal = createElement('section', 'mg-modal mg-balance-panel');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'balanceGameTitle');

    const kicker = createElement('p', 'mg-balance-kicker', '번역 중이에요. 잠깐 밸런스 게임 한 판!');
    const title = createElement('h2', 'mg-balance-title', question.question);
    title.id = 'balanceGameTitle';

    const choices = createElement('div', 'mg-balance-choices');
    const vs = createElement('div', 'mg-balance-vs', 'VS');
    choices.append(
      buildBalanceOption(question.options[0], 'a'),
      vs,
      buildBalanceOption(question.options[1], 'b'),
    );

    modal.append(kicker, title, choices, buildBalanceProgress());
    renderInBackdrop(modal);
    modal.querySelector('.mg-balance-card')?.focus();
  }

  function selectBalanceOption(option) {
    if (!balanceState) return;

    balanceState.answers.push({
      questionIndex: balanceState.currentIndex,
      key: option.key,
      text: option.text,
    });
    applyScores(balanceState.scores, option.scores);
    balanceState.currentIndex += 1;

    if (balanceState.currentIndex >= BALANCE_QUESTIONS.length) {
      renderBalanceResult();
      return;
    }

    renderBalanceQuestion();
  }

  function getBalanceResult() {
    const scores = balanceState?.scores || {};
    return BALANCE_RESULTS
      .map(result => ({ ...result, value: result.score(scores) }))
      .sort((a, b) => b.value - a.value)[0];
  }

  function saveBalanceResult(result) {
    try {
      sessionStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify({
        resultId: result.id,
        title: result.title,
        tags: result.tags,
        answers: balanceState.answers,
        completedAt: new Date().toISOString(),
      }));
    } catch (error) {
      // sessionStorage를 사용할 수 없는 환경에서는 결과 저장만 건너뛴다.
    }
  }

  function renderBalanceResult() {
    const result = getBalanceResult();
    saveBalanceResult(result);
    hideTranslationDoneNotice();

    const modal = createElement('section', 'mg-modal mg-balance-result');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'balanceResultTitle');

    const kicker = createElement('p', 'mg-balance-result-kicker', '밸런스 게임 완료!');
    const intro = createElement('p', 'mg-balance-result-intro', '당신의 웹소설 취향은');
    const title = createElement('h2', 'mg-balance-result-title', result.title);
    title.id = 'balanceResultTitle';
    const desc = createElement('p', 'mg-balance-result-desc', result.description);

    const tags = createElement('div', 'mg-balance-result-tags');
    result.tags.forEach(tag => {
      tags.appendChild(createElement('span', 'mg-balance-result-tag', formatTag(tag)));
    });

    const action = createElement('button', 'mg-primary-action');
    action.type = 'button';
    const actionText = createElement('span', 'mg-primary-action-text', '번역본 확인하기');
    const actionIcon = createElement('img', 'mg-primary-action-icon');
    actionIcon.src = `${MINIGAME_ASSET_BASE_URL}/arrow_right.svg`;
    actionIcon.alt = '';
    actionIcon.setAttribute('aria-hidden', 'true');
    action.append(actionText, actionIcon);
    action.addEventListener('click', () => {
      closeBackdrop();
      activateTranslationTab();
      document.dispatchEvent(new CustomEvent('translation:minigame-complete', {
        detail: { game: 'balance', result },
      }));
    });

    modal.append(kicker, intro, title, desc, tags, action);
    renderInBackdrop(modal);
    action.focus();
  }

  function startBalance(translationDetail = {}) {
    openBackdrop();
    balanceState = {
      translationDetail,
      currentIndex: 0,
      answers: [],
      scores: {},
    };
    renderBalanceQuestion();
  }

  function registerGame(gameName, starter) {
    if (!gameName || typeof starter !== 'function') return;
    gameRegistry.set(gameName, starter);
  }

  function startRandomMinigame(detail = {}) {
    const games = Array.from(gameRegistry.entries());
    if (games.length === 0) return;

    const [, starter] = games[Math.floor(Math.random() * games.length)];
    starter(detail);
  }

  registerGame('worldcup', startWorldcup);
  registerGame('balance', startBalance);

  window.WLighterMinigames = {
    registerGame,
    startRandomMinigame,
    startWorldcup,
    startBalance,
    showTranslationDoneNotice,
  };

  document.addEventListener('translation:credit-confirmed', (event) => {
    startRandomMinigame(event.detail);
  });

  document.addEventListener('translation:done', () => {
    showTranslationDoneNotice();
  });
})();
