(function () {
  const modal = document.querySelector('[data-login-modal]');
  const backdrop = document.querySelector('[data-login-backdrop]');
  const openButtons = document.querySelectorAll('[data-open-login]');
  const closeButtons = document.querySelectorAll('[data-close-login]');
  let lastFocusedElement = null;

  function openModal() {
    if (!modal) return;
    lastFocusedElement = document.activeElement;
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.classList.add('open');
    }
    modal.hidden = false;
    modal.classList.add('open');
    document.body.classList.add('is-modal-open');
    modal.querySelector('.modal-close')?.focus();
  }

  function closeModal() {
    if (!modal) return;
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.classList.remove('open');
    }
    modal.hidden = true;
    modal.classList.remove('open');
    document.body.classList.remove('is-modal-open');
    lastFocusedElement?.focus?.();
  }

  openButtons.forEach((button) => button.addEventListener('click', openModal));
  closeButtons.forEach((button) => button.addEventListener('click', closeModal));
  backdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  const heroImages = document.querySelectorAll('.hero-image-card img');
  heroImages.forEach((image) => {
    image.addEventListener('error', () => {
      image.style.display = 'none';
      image.closest('.hero-image-card')?.classList.add('is-placeholder');
    });
  });

  const features = [
    {
      kicker: '01 — 현지화 가이드',
      title: '작품 분석으로 완성하는<br>타깃 국가별 현지화 전략',
      description:
        '작품의 문체와 시놉시스를 분석해, 타깃 국가의 문화·시장 맥락에 맞는 현지화 가이드를 제공합니다. 시놉시스가 있으면 적합한 수출 국가까지 추천해 드립니다.',
      bullets: [
        '일본·중국·미국·태국 4개국 문화 코드 기반 특성 안내',
        '원작의 고유한 매력을 유지하며 현지 정서에 맞춘 문체 변환 가이드 제공',
        '국가별 플랫폼 게시 규정·문화 주의사항 사전 점검',
      ],
      mockup: 'guide',
      mockupTitle: '현지화 가이드',
    },
    {
      kicker: '02 — 번역 검수',
      title: '기계번역을 넘어서,<br>맥락 중심의 AI 현지화 번역',
      description:
        '번역기 특유의 어색함 없이 원작의 필력을 그대로 살리고, AI 검수 챗봇과 대화하며 자연스러운 현지어 번역을 완성합니다.',
      bullets: [
        '문화적 맥락과 트렌디한 현지 관용구를 반영한 자연스러운 번역',
        '번역 오역 및 뉘앙스 교정을 위한 전용 AI 검수 챗봇 탑재',
        '한국어 원문과 현지화 번역문의 직관적인 실시간 대조 편집',
      ],
      mockup: 'translate',
      mockupTitle: '번역 / 검수',
    },
    {
      kicker: '03 — 표지 이미지',
      title: '작품 원문을 분석해 완성되는<br>작품 맞춤형 AI 표지',
      description:
        '비싼 외주 비용 부담 없이, 시놉시스와 장르에 딱 맞는 고품질 글로벌 웹소설 표지 시안을 즉시 생성하고 비교합니다.',
      bullets: [
        '제목·원문 속 인물 특징 분석 기반 무드 매칭',
        '타깃 국가에 맞춘 표지 스타일 적용',
        '정밀한 스타일 수정을 위한 커스텀 프롬프트 요청 기능',
      ],
      mockup: 'cover',
      mockupTitle: '표지 이미지 생성',
    },
    {
      kicker: '04 — 캐릭터 관계도',
      title: '복잡한 서사와 인물 관계의<br>완전한 시각화',
      description:
        '복잡한 인물 관계와 설정을 AI가 자동 추출·시각화해, 장기 연재 시 설정을 한눈에 관리하도록 돕습니다.',
      bullets: [
        'AI 기반 등장인물 관계 자동 추출',
        '동일 인물 별칭·호칭 자동 통합',
        '복잡한 플롯을 한눈에 파악하는 관계도 시각화 노드',
      ],
      mockup: 'relation',
      mockupTitle: '캐릭터 관계도',
    },
  ];

  const tabs = document.querySelectorAll('[data-feature-tab]');
  const kicker = document.querySelector('[data-feature-kicker]');
  const title = document.querySelector('[data-feature-title]');
  const description = document.querySelector('[data-feature-description]');
  const list = document.querySelector('[data-feature-list]');
  const mockup = document.querySelector('[data-feature-mockup]');
  const mockupImage = mockup?.querySelector('img');
  const mockupTitle = document.querySelector('[data-feature-mockup-title]');
  const prev = document.querySelector('[data-feature-prev]');
  const next = document.querySelector('[data-feature-next]');
  const featurePanel = document.querySelector('#feature-panel');
  const featureTabs = document.querySelector('.feature-tabs');
  let featureIndex = 0;
  let featureTimer = null;

  function renderFeature(index) {
    featureIndex = (index + features.length) % features.length;
    const feature = features[featureIndex];

    if (kicker) kicker.textContent = feature.kicker;
    if (title) title.innerHTML = feature.title;
    if (description) description.textContent = feature.description;
    if (list) {
      list.innerHTML = feature.bullets.map((bullet) => `<li>${bullet}</li>`).join('');
    }
    if (mockup) {
      mockup.dataset.featureMockup = feature.mockup;
    }
    if (mockupImage) {
      mockupImage.src = mockup?.dataset[`mockup${feature.mockup[0].toUpperCase()}${feature.mockup.slice(1)}`] || mockupImage.src;
    }
    if (mockupTitle) mockupTitle.textContent = feature.mockupTitle;

    tabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === featureIndex;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => renderFeature(Number(tab.dataset.featureTab)));
  });
  prev?.addEventListener('click', () => renderFeature(featureIndex - 1));
  next?.addEventListener('click', () => renderFeature(featureIndex + 1));

  function startFeatureCarousel() {
    if (featureTimer) return;
    featureTimer = window.setInterval(() => renderFeature(featureIndex + 1), 5000);
  }

  function stopFeatureCarousel() {
    window.clearInterval(featureTimer);
    featureTimer = null;
  }

  [featureTabs, featurePanel].forEach((featurePauseTarget) => {
    featurePauseTarget?.addEventListener('mouseenter', stopFeatureCarousel);
    featurePauseTarget?.addEventListener('mouseleave', startFeatureCarousel);
    featurePauseTarget?.addEventListener('focusin', stopFeatureCarousel);
    featurePauseTarget?.addEventListener('focusout', startFeatureCarousel);
  });
  startFeatureCarousel();

  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const button = item.querySelector('.faq-question');
    button?.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
  });

  const storyTrack = document.querySelector('[data-story-track]');
  let storyTimer = null;
  let storyIsSliding = false;

  function syncFeaturedStory(featuredIndex = 1) {
    if (!storyTrack) return;
    Array.from(storyTrack.children).forEach((card, index) => {
      const isFeatured = index === featuredIndex;
      const quoteIcon = card.querySelector('.quote-icon');
      card.classList.toggle('is-featured', isFeatured);
      if (quoteIcon?.dataset.quoteFeatured && quoteIcon?.dataset.quoteDefault) {
        quoteIcon.src = isFeatured ? quoteIcon.dataset.quoteFeatured : quoteIcon.dataset.quoteDefault;
      }
    });
  }

  function rotateStories() {
    if (!storyTrack || storyTrack.children.length < 2 || storyIsSliding) return;
    storyIsSliding = true;
    syncFeaturedStory(2);
    storyTrack.classList.add('is-sliding');
  }

  function startStorySlider() {
    if (storyTimer) return;
    storyTimer = window.setInterval(rotateStories, 4200);
  }

  function stopStorySlider() {
    window.clearInterval(storyTimer);
    storyTimer = null;
  }

  storyTrack?.addEventListener('mouseenter', stopStorySlider);
  storyTrack?.addEventListener('mouseleave', startStorySlider);
  storyTrack?.addEventListener('focusin', stopStorySlider);
  storyTrack?.addEventListener('focusout', startStorySlider);
  storyTrack?.addEventListener('transitionend', (event) => {
    if (event.propertyName !== 'transform' || !storyTrack.classList.contains('is-sliding')) return;

    storyTrack.style.transition = 'none';
    storyTrack.appendChild(storyTrack.children[0]);
    storyTrack.classList.remove('is-sliding');
    syncFeaturedStory(1);
    storyTrack.offsetHeight;
    storyTrack.style.transition = '';
    storyIsSliding = false;
  });
  syncFeaturedStory();
  startStorySlider();
})();
