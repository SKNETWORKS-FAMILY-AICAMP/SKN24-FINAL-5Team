// localization.js — 현지화 가이드 페이지

document.addEventListener('DOMContentLoaded', () => {

  // ---------- SVG ----------
  const SVG_REPORT  = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="11" cy="14" r="3"/><line x1="13.5" y1="16.5" x2="16" y2="19"/></svg>`;
  const SVG_CHEVRON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  const SVG_DOWN    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const SVG_UP      = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;

  // ---------- 상수 ----------
  const MAX_GUIDES = 5;

  // ---------- Mock 데이터 ----------
  // 실제 생성 결과로 채워짐(workId → [guide]). 초기엔 빈 상태.
  const mockGuides = {};

  // 작품별 시놉 여부 (dropdown item의 data-synopsis 반영)
  const workSynopsisMap = { '1': true, '2': true, '3': false, '4': true };
  const countryNameMap  = { EN: '미국', CN: '중국', JP: '일본', TH: '태국' };

  // 상세 mock 데이터 (모든 가이드 공통)
  const mockDetail = {
    referenceWorks: 8,
    referencePlatforms: 2,
    platforms: ['Wattpad', 'Tapas'],
    frequentTags: [
      { name: 'fantasy',        count: 4, max: 4 },
      { name: 'Romance Fant...', count: 4, max: 4 },
      { name: 'WAIT_UNTIL_...', count: 4, max: 4 },
      { name: 'COMPLETED',      count: 3, max: 4 },
      { name: 'femaleprotag...', count: 2, max: 4 },
      { name: 'aristocracy',    count: 1, max: 4 },
      { name: 'betrayal',       count: 1, max: 4 },
    ],
    tagCombos: [
      { name: 'Romance Fant...', count: 3, max: 3 },
      { name: 'aristocracy + ...', count: 1, max: 3 },
      { name: 'changedesti...',  count: 1, max: 3 },
      { name: '-romance + co...', count: 1, max: 3 },
      { name: '30daywritingc...', count: 1, max: 3 },
      { name: 'Romance Fant...', count: 1, max: 3 },
    ],
    comboNote: '같은 작품에 함께 붙어 있던 태그 조합입니다. 내 작품의 모두 적용하라는 뜻은 아닙니다.',
  };

  // ---------- 상태 ----------
  let selectedWorkId   = null;
  let hasSynopsis      = true;
  let selectedCountry  = null; // { code, name }
  let isGenerating     = false;

  // ---------- DOM ----------
  const emptyState   = document.getElementById('lcEmptyState');
  const guideList    = document.getElementById('lcGuideList');
  const resultCount  = document.getElementById('lcResultCount');
  const generateBtn  = document.getElementById('lcGenerateBtn');
  const noSynopsis   = document.getElementById('lcNoSynopsis');
  const countryGroup = document.getElementById('lcCountryGroup');
  const countryChips = document.getElementById('lcCountryChips');
  const toast        = document.getElementById('lcToast');
  const creditChip   = document.querySelector('.credit-chip[data-credit-use-url]');

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }

  function updateCreditBalance(balance) {
    document.querySelectorAll('.credit-chip').forEach(el => {
      el.textContent = `${formatNumber(balance)} C`;
    });
  }

  async function spendCredit(feature) {
    const url = creditChip?.dataset.creditUseUrl;
    const csrf = creditChip?.dataset.csrf;
    if (!url || !csrf) throw new Error('크레딧 차감 설정을 찾을 수 없습니다.');
    const form = new FormData();
    form.append('feature', feature);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': csrf, 'X-Requested-With': 'XMLHttpRequest' },
      body: form,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      if (typeof data.balance === 'number') updateCreditBalance(data.balance);
      throw new Error(data.message || '크레딧 차감에 실패했습니다.');
    }
    updateCreditBalance(data.balance);
    return data;
  }

  // ---------- 우측 패널 렌더 ----------
  function renderList(workId) {
    const guides = mockGuides[workId] || [];
    resultCount.textContent = `${guides.length + (isGenerating ? 1 : 0)} / ${MAX_GUIDES} 개`;

    if (guides.length === 0 && !isGenerating) {
      emptyState.style.display = '';
      guideList.style.display  = 'none';
      return;
    }
    emptyState.style.display = 'none';
    guideList.style.display  = 'flex';
    guideList.innerHTML = '';

    // 생성 중이면 로딩 행 유지
    if (isGenerating) {
      guideList.insertAdjacentHTML('afterbegin', `
        <div class="lc-row-loading" id="lcLoadingRow">
          <div class="lc-spinner"></div>
          <span>생성 중</span>
        </div>
      `);
    }

    guides.forEach(g => {
      guideList.insertAdjacentHTML('beforeend', `
        <div class="lc-guide-row" data-id="${g.id}">
          <div class="lc-row-icon">${SVG_REPORT}</div>
          <div class="lc-row-info">
            <p class="lc-row-title">${g.title}</p>
            <p class="lc-row-date">생성일시&nbsp;&nbsp;${g.createdAt}</p>
          </div>
          <span class="lc-row-arrow">${SVG_CHEVRON}</span>
        </div>
      `);
    });
  }

  function resetList() {
    resultCount.textContent  = `0 / ${MAX_GUIDES} 개`;
    emptyState.style.display = '';
    guideList.style.display  = 'none';
    guideList.innerHTML      = '';
  }

  // ---------- 좌측 패널 상태 ----------
  function applyWorkState(workId) {
    // 실제 작품의 시놉시스 유무(드롭다운 항목의 data-synopsis)로 판단
    const item = document.querySelector('.lc-dropdown-item[data-id="' + workId + '"]');
    hasSynopsis = item ? item.dataset.synopsis === 'true' : true;
    selectedCountry = null;

    if (hasSynopsis) {
      noSynopsis.style.display   = 'none';
      countryGroup.style.display = 'none';
    } else {
      noSynopsis.style.display   = 'flex';
      countryGroup.style.display = 'flex';
      // 칩 선택 초기화
      countryChips.querySelectorAll('.lc-country-chip').forEach(c => c.classList.remove('selected'));
    }
  }

  // ---------- 드롭다운 ----------
  const selectWrap    = document.getElementById('lcWorkSelectWrap');
  const selectTrigger = document.getElementById('lcWorkSelectTrigger');
  const selectText    = document.getElementById('lcWorkSelectText');
  const dropdown      = document.getElementById('lcWorkDropdown');
  const dropdownItems = dropdown?.querySelectorAll('.lc-dropdown-item');
  const chevron       = document.getElementById('lcWorkSelectChevron');

  selectTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = selectWrap.classList.toggle('open');
    selectTrigger.setAttribute('aria-expanded', isOpen);
    if (chevron) chevron.innerHTML = isOpen ? SVG_UP : SVG_DOWN;
  });

  dropdownItems?.forEach(item => {
    item.addEventListener('click', () => {
      const title = item.dataset.title;
      selectedWorkId = item.dataset.id;

      dropdownItems.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      selectText.textContent = title;
      selectText.classList.add('selected');

      const iconWrap = selectTrigger.querySelector('.lc-select-icon');
      const thumbEl  = item.querySelector('.lc-di-img');
      if (thumbEl?.src && !thumbEl.src.endsWith('/')) {
        iconWrap.innerHTML = `<img src="${thumbEl.src}" alt="${title}">`;
      } else {
        // 표지 없는 작품 → 기본 아이콘으로 복원(이전 작품 표지 잔상 제거)
        iconWrap.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 3v18M8 7h4M8 11h3"/></svg>';
      }

      selectWrap.classList.remove('open');
      selectTrigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;

      applyWorkState(selectedWorkId);
      loadSavedGuides(selectedWorkId);
    });
  });

  // ===== 저장된 가이드 불러오기 (작품 선택 시) =====
  async function loadSavedGuides(workId) {
    document.getElementById('guideDebugBox')?.remove();
    if (window.GUIDE_CONFIG?.savedUrl) {
      const url = window.GUIDE_CONFIG.savedUrl.replace('/0/', '/' + workId + '/');
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.ok && Array.isArray(data.guides)) {
          mockGuides[workId] = data.guides.map(g => ({
            id: 'db_' + g.id,
            title: g.countryName ? `현지화 가이드 — ${g.countryName}` : '현지화 가이드',
            country: g.country || null,
            createdAt: g.createdAt,
            htmlReport: g.htmlReport || '',
          }));
        }
      } catch (e) {
        console.error('[load guides]', e);
      }
    }
    renderList(workId);
  }

  document.addEventListener('click', (e) => {
    if (!selectWrap?.contains(e.target)) {
      selectWrap?.classList.remove('open');
      selectTrigger?.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;
    }
  });

  // ---------- 국가 칩 ----------
  countryChips?.addEventListener('click', (e) => {
    const chip = e.target.closest('.lc-country-chip');
    if (!chip) return;
    countryChips.querySelectorAll('.lc-country-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    selectedCountry = { code: chip.dataset.code, name: chip.dataset.name };
  });

  // ---------- 생성 버튼 ----------
  generateBtn?.addEventListener('click', async () => {
    if (!selectedWorkId) {
      showToast('※ 작품을 먼저 선택해 주세요.');
      return;
    }

    if (!hasSynopsis && !selectedCountry) {
      showToast('※ 국가를 선택해 주세요.');
      return;
    }

    const workId  = selectedWorkId;
    const existing = mockGuides[workId] || [];

    // 5개 꽉 찼으면 → 덮어쓰기 확인
    if (existing.length >= MAX_GUIDES) {
      openOverwriteModal(workId);
      return;
    }

    try {
      await spendCredit('localization_guide');
      doGenerate(workId);
    } catch (error) {
      if (window.AppUI && /부족/.test(error.message)) AppUI.creditModal();
      else showToast(`※ ${error.message}`);
    }
  });

  function doGenerate(workId, overwrite = false) {
    const list = mockGuides[workId] || (mockGuides[workId] = []);

    if (overwrite && list.length >= MAX_GUIDES) {
      // 가장 오래된 항목(배열 마지막)을 즉시 제거
      const oldest = list.pop();

      // 서버에서도 즉시 삭제 (db_ prefix인 경우)
      const m = /^db_(\d+)$/.exec(String(oldest?.id || ''));
      if (m && window.GUIDE_CONFIG?.deleteUrl && workId) {
        const url = window.GUIDE_CONFIG.deleteUrl.replace('/0/', '/' + workId + '/');
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.GUIDE_CONFIG.csrfToken },
          body: JSON.stringify({ guideId: m[1] }),
        }).catch(e => console.warn('[guide delete oldest]', e));
      }

      // 목록 즉시 갱신 (4개로 줄어든 상태 반영)
      renderList(workId);
    }

    // 생성 중 행 추가
    isGenerating = true;
    resultCount.textContent = `${list.length + 1} / ${MAX_GUIDES} 개`;
    emptyState.style.display = 'none';
    guideList.style.display  = 'flex';
    if (!guideList.querySelector('#lcLoadingRow')) {
      guideList.insertAdjacentHTML('afterbegin', `
        <div class="lc-row-loading" id="lcLoadingRow">
          <div class="lc-spinner"></div>
          <span>생성 중</span>
        </div>
      `);
    }
    generateBtn.disabled = true;
    runGuideGenerate(workId);
  }

  // 모델 서버 응답 구조 확인용 RAW 박스
  function showGuideDebug(html) {
    let box = document.getElementById('guideDebugBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'guideDebugBox';
      box.style.cssText = 'margin-top:16px;padding:16px;border:1px solid var(--color-border,#cfc3fb);' +
        'border-radius:12px;background:var(--color-surface,#fff);font-size:13px;';
      (guideList?.parentNode || document.body).appendChild(box);
    }
    box.innerHTML = html;
  }
  function escGuide(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function runGuideGenerate(workId) {
    if (!window.GUIDE_CONFIG || !window.GUIDE_CONFIG.generateUrl) { showToast('※ 설정 오류로 가이드를 생성할 수 없습니다.'); generateBtn.disabled = false; return; }
    // 생성 중에는 상단 로딩 박스(lc-row-loading)를 그대로 유지
    try {
      const res = await fetch(window.GUIDE_CONFIG.generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.GUIDE_CONFIG.csrfToken },
        body: JSON.stringify({ workId, targetCountry: selectedCountry?.code || 'EN' }),
      });
      const data = await res.json();
      console.log('[guide] HTTP', res.status, data);
      if (!data.ok) {
        isGenerating = false;
        document.getElementById('lcLoadingRow')?.remove();
        showGuideDebug(
          '<p style="font-weight:700;margin-bottom:6px;">현지화 가이드를 생성하지 못했어요</p>' +
          '<p style="color:#ff2d55;margin:0 0 10px;line-height:1.6;">' + escGuide(data.error || ('오류 ' + res.status)) + '</p>' +
          '<details style="font-size:12px;color:var(--color-text-muted,#8a8a99);"><summary style="cursor:pointer;">자세히 (개발용)</summary>' +
          '<pre style="white-space:pre-wrap;word-break:break-all;line-height:1.6;max-height:320px;overflow:auto;margin:8px 0 0;">' +
          escGuide(JSON.stringify(data, null, 2)) + '</pre></details>'
        );
        return;
      }
      // 성공 → 가이드 목록에 추가
      document.getElementById('guideDebugBox')?.remove();
      const r = data.result || {};
      const country = r.displayCountry || r.targetCountryDisplay || selectedCountry?.name || '';
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      // 모델 서버가 저장한 실제 guide_id를 받아 id로 사용 → 새로고침 전에도 서버 삭제 가능
      const pg = r.persistedGuide || {};
      const gid = pg.guide_id || pg.id;
      const guide = {
        id: gid ? ('db_' + gid) : ('gd_' + Date.now()),
        title: r.title || (country ? `현지화 가이드 — ${country}` : '현지화 가이드'),
        country: selectedCountry?.code || null,
        createdAt: dateStr,
        htmlReport: r.htmlReport || '',
      };
      const list = mockGuides[workId] || (mockGuides[workId] = []);
      list.unshift(guide);
      isGenerating = false;
      renderList(workId);
    } catch (err) {
      console.error('[guide] error', err);
      isGenerating = false;
      document.getElementById('lcLoadingRow')?.remove();
      showGuideDebug('<p style="color:#ff2d55;">네트워크 오류가 발생했습니다. 콘솔을 확인하세요.</p>');
    } finally {
      generateBtn.disabled = false;
    }
  }

  // ---------- 상세 조회 모달 ----------
  const detailBackdrop  = document.getElementById('lcDetailBackdrop');
  const detailModal     = document.getElementById('lcDetailModal');
  const detailTitle     = document.getElementById('lcDetailTitle');
  const detailDate      = document.getElementById('lcDetailDate');
  const detailBody      = document.getElementById('lcDetailBody');
  const detailClose     = document.getElementById('lcDetailClose');
  const detailDeleteBtn = document.getElementById('lcDetailDeleteBtn');
  let   detailTargetId  = null;

  function buildGuideContent(guide) {
    const d = mockDetail;
    const tagRows = d.frequentTags.map(t => `
      <div class="lc-tag-row">
        <span class="lc-tag-name">${t.name}</span>
        <div class="lc-tag-bar-wrap"><div class="lc-tag-bar" style="width:${Math.round(t.count/t.max*100)}%"></div></div>
        <span class="lc-tag-count">${t.count}건</span>
      </div>`).join('');
    const comboRows = d.tagCombos.map(t => `
      <div class="lc-tag-row">
        <span class="lc-tag-name">${t.name}</span>
        <div class="lc-tag-bar-wrap"><div class="lc-tag-bar" style="width:${Math.round(t.count/t.max*100)}%"></div></div>
        <span class="lc-tag-count">${t.count}건</span>
      </div>`).join('');
    const platformChips = d.platforms.map(p => `<span class="lc-platform-chip">${p}</span>`).join('');

    return `
      <div class="lc-guide-content">
        <h3 class="lc-content-title">작품 소재와 대조한 플랫폼 데이터</h3>
        <p class="lc-content-desc">아래 내용은 대상 국가 플랫폼에서 공개적으로 관찰한 작품/태그 데이터만 간단히 보여줍니다. 국가별 우열이나 시장 성공 가능성을 뜻하지 않습니다.</p>
        <div class="lc-stat-cards">
          <div class="lc-stat-card">
            <span class="lc-stat-label">참고한 작품 수</span>
            <span class="lc-stat-value">${d.referenceWorks}편</span>
          </div>
          <div class="lc-stat-card">
            <span class="lc-stat-label">참고한 플랫폼</span>
            <span class="lc-stat-value">${d.referencePlatforms}곳</span>
          </div>
        </div>
        <div class="lc-platform-chips">${platformChips}</div>
        <div class="lc-tag-section">
          <div class="lc-tag-col">
            <p class="lc-tag-col-title">참고 데이터에서 자주 보인 태그</p>
            ${tagRows}
          </div>
          <div class="lc-tag-col">
            <p class="lc-tag-col-title">함께 자주 보인 태그 조합</p>
            ${comboRows}
            <p class="lc-combo-note">${d.comboNote}</p>
          </div>
        </div>
      </div>`;
  }

  let detailHtmlReport = '';
  let detailFilename   = '현지화 가이드';

  function openDetailModal(guide) {
    detailTargetId          = guide.id;
    detailHtmlReport        = guide.htmlReport || '';
    detailFilename          = (guide.title || '현지화 가이드').replace(/[\\/:*?"<>|]/g, ' ').trim();
    detailTitle.textContent = guide.title;
    detailDate.textContent  = `생성일시  ${guide.createdAt}`;
    if (guide.htmlReport) {
      // 모델이 만든 완성형 HTML 가이드 → iframe으로 격리 렌더링(자체 스타일 보호)
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%;height:70vh;border:none;border-radius:12px;background:#fff;';
      iframe.srcdoc = guide.htmlReport;
      detailBody.innerHTML = '';
      detailBody.appendChild(iframe);
    } else {
      detailBody.innerHTML = buildGuideContent(guide);
    }
    detailBackdrop.classList.add('open');
    detailModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    detailBackdrop.classList.remove('open');
    detailModal.classList.remove('open');
    document.body.style.overflow = '';
    detailTargetId = null;
  }

  guideList?.addEventListener('click', (e) => {
    const row = e.target.closest('.lc-guide-row');
    if (!row) return;
    const guide = (mockGuides[selectedWorkId] || []).find(g => g.id === row.dataset.id);
    if (guide) openDetailModal(guide);
  });

  detailClose?.addEventListener('click', closeDetailModal);
  detailBackdrop?.addEventListener('click', closeDetailModal);

  // PDF 다운로드: 대화상자 없이 바로 .pdf 저장 (html2pdf). 미로드 시 인쇄로 폴백.
  const pdfBtn = document.getElementById('lcDetailPdfBtn');
  pdfBtn?.addEventListener('click', () => {
    if (!detailHtmlReport) {
      showToast('※ 이 가이드에는 다운로드할 내용이 없습니다.');
      return;
    }

    // 데스크톱 폭(1120px)으로 렌더하기 위한 숨김 iframe
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:0;top:0;width:1240px;height:1600px;border:0;opacity:0;pointer-events:none;';
    frame.srcdoc = detailHtmlReport;
    document.body.appendChild(frame);

    const oldText = pdfBtn.textContent;
    pdfBtn.disabled = true;
    pdfBtn.textContent = 'PDF 생성 중...';

    const finish = () => { pdfBtn.disabled = false; pdfBtn.textContent = oldText; frame.remove(); };
    const fail = (e) => { console.error('[guide pdf]', e); showToast('PDF 생성에 실패했습니다.'); finish(); };

    frame.onload = async () => {
      const doc = frame.contentDocument;
      const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;

      // 라이브러리 미로드 → 인쇄로 폴백
      if (!window.html2canvas || !jsPDFCtor || !doc) {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); }
        catch (e) { showToast('PDF 기능을 사용할 수 없습니다.'); }
        pdfBtn.disabled = false; pdfBtn.textContent = oldText;
        setTimeout(() => frame.remove(), 60000);
        return;
      }

      try {
        // 폰트/레이아웃 안정화 대기
        if (doc.fonts && doc.fonts.ready) { try { await doc.fonts.ready; } catch (e) {} }

        // 토글/아코디언 강제 펼침, 애니메이션 제거, overflow 해제
        const printStyle = doc.createElement('style');
        printStyle.textContent = `
          * { transition: none !important; animation: none !important; }
          div, section, article, aside, main, li, p, span, a {
            overflow: visible !important;
            max-height: none !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          details { display: block !important; }
          details, details[open] { height: auto !important; overflow: visible !important; }
          summary ~ * { display: block !important; }
          [class*="toggle"], [class*="accordion"], [class*="collapse"],
          [class*="expand"], [class*="hidden"] {
            display: block !important; height: auto !important;
            max-height: none !important; overflow: visible !important;
            opacity: 1 !important; visibility: visible !important;
          }
        `;
        doc.head.appendChild(printStyle);
        doc.querySelectorAll('details').forEach(d => { d.open = true; });
        await new Promise(r => setTimeout(r, 300));

        const fullWidth  = Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth, 1);
        const fullHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 1);
        const canvas = await window.html2canvas(doc.body, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: fullWidth,
          width: fullWidth,
          height: fullHeight,
          scrollX: 0,
          scrollY: 0,
        });

        const pdf = new jsPDFCtor({ unit: 'pt', format: 'a4', orientation: 'portrait' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const scale = pageW / canvas.width;          // canvas → PDF pt 비율
        const pageHpx = Math.floor(pageH / scale);  // PDF 1페이지 높이(px, canvas 기준)
        const SCAN = 40;                             // 경계 위아래 탐색 범위(px)
        const ctx = canvas.getContext('2d');

        // 주어진 y 행이 "거의 흰색"인지 판별
        function isWhiteRow(y) {
          if (y < 0 || y >= canvas.height) return true;
          const data = ctx.getImageData(0, y, canvas.width, 1).data;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] < 240 || data[i+1] < 240 || data[i+2] < 240) return false;
          }
          return true;
        }

        // 페이지 경계(idealY) 근처에서 흰 줄 찾기 → 없으면 idealY 그대로
        function findSafeCut(idealY) {
          for (let d = 0; d <= SCAN; d++) {
            if (isWhiteRow(idealY - d)) return idealY - d;
            if (isWhiteRow(idealY + d)) return idealY + d;
          }
          return idealY;
        }

        // 캔버스를 안전한 지점에서 잘라 PDF에 추가
        let y = 0;
        let first = true;
        while (y < canvas.height) {
          const idealEnd = y + pageHpx;
          const cutY = findSafeCut(Math.min(idealEnd, canvas.height));
          const sliceH = Math.max(1, cutY - y);

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width  = canvas.width;
          pageCanvas.height = sliceH;
          pageCanvas.getContext('2d').drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

          const imgH = sliceH * scale;
          if (!first) pdf.addPage();
          pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, pageW, imgH);
          first = false;
          y = cutY;
        }

        pdf.save(detailFilename + '.pdf');
        finish();
      } catch (e) {
        fail(e);
      }
    };
  });

  // 상세 삭제 버튼 → 삭제 확인 모달
  detailDeleteBtn?.addEventListener('click', () => {
    deleteTargetId = detailTargetId;
    lcDeleteBackdrop.classList.add('open');
    lcDeleteModal.classList.add('open');
  });

  // ---------- 덮어쓰기 확인 모달 ----------
  const lcOverwriteBackdrop = document.getElementById('lcOverwriteBackdrop');
  const lcOverwriteModal    = document.getElementById('lcOverwriteModal');
  let   overwriteWorkId     = null;

  function openOverwriteModal(workId) {
    overwriteWorkId = workId;
    lcOverwriteBackdrop.classList.add('open');
    lcOverwriteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeOverwriteModal() {
    lcOverwriteBackdrop.classList.remove('open');
    lcOverwriteModal.classList.remove('open');
    document.body.style.overflow = '';
    overwriteWorkId = null;
  }

  document.getElementById('lcOverwriteCancel')?.addEventListener('click', closeOverwriteModal);
  lcOverwriteBackdrop?.addEventListener('click', closeOverwriteModal);
  document.getElementById('lcOverwriteConfirm')?.addEventListener('click', async () => {
    const wid = overwriteWorkId;
    closeOverwriteModal();
    try {
      await spendCredit('localization_guide');
      doGenerate(wid, true);
    } catch (error) {
      if (window.AppUI && /부족/.test(error.message)) AppUI.creditModal();
      else showToast(`※ ${error.message}`);
    }
  });

  // ---------- 삭제 확인 모달 ----------
  const lcDeleteBackdrop = document.getElementById('lcDeleteBackdrop');
  const lcDeleteModal    = document.getElementById('lcDeleteModal');
  let   deleteTargetId   = null;

  function closeDeleteModal() {
    lcDeleteBackdrop.classList.remove('open');
    lcDeleteModal.classList.remove('open');
    document.body.style.overflow = '';
    deleteTargetId = null;
  }

  document.getElementById('lcDeleteCancel')?.addEventListener('click', closeDeleteModal);
  lcDeleteBackdrop?.addEventListener('click', closeDeleteModal);
  document.getElementById('lcDeleteConfirm')?.addEventListener('click', async () => {
    const targetId = deleteTargetId;
    closeDeleteModal();
    closeDetailModal();

    // 서버(RDS)에서 실제 삭제 — DB 저장본은 'db_<guide_id>' 형태
    const m = /^db_(\d+)$/.exec(String(targetId || ''));
    if (m && window.GUIDE_CONFIG?.deleteUrl && selectedWorkId) {
      try {
        const url = window.GUIDE_CONFIG.deleteUrl.replace('/0/', '/' + selectedWorkId + '/');
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.GUIDE_CONFIG.csrfToken },
          body: JSON.stringify({ guideId: m[1] }),
        });
        const data = await res.json();
        if (!data.ok) { showToast('※ ' + (data.error || '가이드 삭제에 실패했습니다.')); return; }
      } catch (e) {
        console.error('[guide delete]', e);
        showToast('※ 가이드 삭제 중 오류가 발생했습니다.');
        return;
      }
    }

    if (selectedWorkId && mockGuides[selectedWorkId]) {
      mockGuides[selectedWorkId] = mockGuides[selectedWorkId].filter(g => g.id !== targetId);
    }
    renderList(selectedWorkId);
    showToast('※ 현지화 가이드가 삭제되었습니다.');
  });

  // ---------- 토스트 ----------
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ---------- ESC ----------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDeleteModal();
      closeDetailModal();
      closeOverwriteModal();
    }
  });

  // ---------- 초기화 ----------
  resetList();

});