// relationship.js — 캐릭터 관계도 페이지

document.addEventListener('DOMContentLoaded', () => {

  // ---------- SVG ----------
  const SVG_REPORT = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="11" cy="14" r="3"/><line x1="13.5" y1="16.5" x2="16" y2="19"/></svg>`;
  const SVG_CHEVRON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  const SVG_CHECK   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_DOWN    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const SVG_UP      = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;

  // ---------- Mock 데이터 ----------
  const MAX_DIAGRAMS = 3;
  const MAX_CHARS    = 10;

  // 정렬용: 주연→조연→단역
  const ROLE_ORDER = { '주연': 0, '조연': 1, '단역': 2 };

  // 작품별 관계도 목록 (작품 선택 시 RDS 데이터로 채워짐)
  const mockDiagrams = {};

  // 작품별 캐릭터 목록 (설정집 저장 데이터로 채워짐)
  const mockCharacters = {};

  // 캐릭터 설정집에서 추출한 실제 캐릭터 (workId → [{id, name, role}])
  const loadedChars = {};

  // 모델 서버 role → 배지(주연/조연/단역)
  function mapRelRole(role) {
    const r = String(role || '').trim();
    if (['주인공', '주연'].includes(r)) return '주연';
    if (['조연', '연인', '조력자', '동료', '파트너'].includes(r)) return '조연';
    return '단역';
  }

  // 캐릭터 설정집에서 "저장된" 캐릭터만 조회 (추출/생성 안 함 — 읽기 전용)
  async function loadCharacters(workId) {
    if (loadedChars[workId]) return loadedChars[workId];
    if (!window.REL_CONFIG || !window.REL_CONFIG.charSavedUrl) throw new Error('charSavedUrl 없음');
    const url = window.REL_CONFIG.charSavedUrl.replace('/0/', '/' + workId + '/');
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || ('오류 ' + res.status));
    const chars = ((data.characters) || []).map((c, i) => ({
      id: 'ch_' + i,
      name: c.char_name || ('캐릭터 ' + (i + 1)),
      role: mapRelRole(c.role),
    }));
    loadedChars[workId] = chars;
    return chars;
  }

  // ---------- 상태 ----------
  let selectedWorkId  = null;
  let isLoaded        = false; // 캐릭터 설정 불러오기 완료 여부
  let selectedCharIds = new Set(); // 모달에서 선택한 캐릭터 ID

  // ---------- DOM ----------
  const emptyState   = document.getElementById('relEmptyState');
  const diagList     = document.getElementById('relDiagramList');
  const resultCount  = document.getElementById('relResultCount');
  const statsBox     = document.getElementById('relStatsBox');
  const statPersons  = document.getElementById('relStatPersons');
  const statRelations= null;
  const generateBtn  = document.getElementById('relGenerateBtn');
  const charLinkBtn  = document.getElementById('relCharLinkBtn');
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
    const diagrams = mockDiagrams[workId] || [];
    resultCount.textContent = `${diagrams.length} / ${MAX_DIAGRAMS} 개`;

    if (diagrams.length === 0) {
      emptyState.style.display = '';
      diagList.style.display   = 'none';
      return;
    }

    emptyState.style.display = 'none';
    diagList.style.display   = 'flex';
    diagList.innerHTML = '';

    diagrams.forEach(diag => {
      diagList.insertAdjacentHTML('beforeend', `
        <div class="rel-diagram-row" data-id="${diag.id}">
          <div class="rel-row-icon">${SVG_REPORT}</div>
          <div class="rel-row-info">
            <p class="rel-row-title">관계도 ver.${diag.version}</p>
            <p class="rel-row-date">생성일시&nbsp;&nbsp;&nbsp;${diag.createdAt}</p>
          </div>
          <span class="rel-row-arrow">${SVG_CHEVRON}</span>
        </div>
      `);
    });
  }

  function resetList() {
    resultCount.textContent = `0 / ${MAX_DIAGRAMS} 개`;
    emptyState.style.display = '';
    diagList.style.display   = 'none';
    diagList.innerHTML = '';
  }

  // ---------- 좌측 패널 상태 ----------
  function showLoadedState(workId) {
    const chars = loadedChars[workId] || mockCharacters[workId] || [];
    statPersons.textContent   = `${chars.length}명`;

    statsBox.style.display    = 'flex';
    statsBox.style.flexDirection = 'column';
    generateBtn.textContent   = '관계도 생성하기 · 300C';
    isLoaded = true;
    // 초기 선택: 전원 선택 (최대 10)
    selectedCharIds = new Set(chars.slice(0, MAX_CHARS).map(c => c.id));
  }

  function resetLoadedState() {
    statsBox.style.display  = 'none';
    generateBtn.textContent = '캐릭터 설정 불러오기';
    isLoaded = false;
    selectedCharIds = new Set();
  }

  // ---------- 드롭다운 ----------
  const selectWrap    = document.getElementById('relWorkSelectWrap');
  const selectTrigger = document.getElementById('relWorkSelectTrigger');
  const selectText    = document.getElementById('relWorkSelectText');
  const dropdown      = document.getElementById('relWorkDropdown');
  const dropdownItems = dropdown?.querySelectorAll('.rel-dropdown-item');
  const chevron       = document.getElementById('relWorkSelectChevron');

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

      const iconWrap = selectTrigger.querySelector('.rel-select-icon');
      const thumbEl  = item.querySelector('.rel-di-img');
      if (thumbEl?.src && !thumbEl.src.endsWith('/')) {
        iconWrap.innerHTML = `<img src="${thumbEl.src}" alt="${title}">`;
      } else {
        // 표지 없는 작품 → 기본 아이콘으로 복원(이전 작품 표지 잔상 제거)
        iconWrap.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 3v18M8 7h4M8 11h3"/></svg>';
      }

      selectWrap.classList.remove('open');
      selectTrigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;

      // 작품 변경 → 상태 초기화 + 저장된 관계도 불러오기
      resetLoadedState();
      loadSavedMaps(selectedWorkId);
    });
  });

  // ===== 저장된 관계도 불러오기 (작품 선택 시) =====
  async function loadSavedMaps(workId) {
    document.getElementById('relDebugBox')?.remove();
    if (window.REL_CONFIG?.savedUrl) {
      const url = window.REL_CONFIG.savedUrl.replace('/0/', '/' + workId + '/');
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.ok && Array.isArray(data.maps)) {
          // 최신순(version 큰 것 먼저)으로 목록 구성
          mockDiagrams[workId] = data.maps.slice().reverse().map(m => ({
            id: 'db_' + m.id, version: m.version, createdAt: m.createdAt, content: m.content,
          }));
        }
      } catch (e) {
        console.error('[load relation maps]', e);
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

  // ---------- 버튼 (불러오기 / 생성하기) ----------
  generateBtn?.addEventListener('click', async () => {
    if (!selectedWorkId) {
      showToast('※ 작품을 먼저 선택해 주세요.');
      return;
    }

    if (!isLoaded) {
      // 캐릭터 설정집에서 "이미 추출해 저장한" 캐릭터만 불러옴 (여기서 추출하지 않음)
      const workId = selectedWorkId;
      generateBtn.disabled = true;
      const prevText = generateBtn.textContent;
      generateBtn.textContent = '불러오는 중...';
      loadCharacters(workId)
        .then((chars) => {
          if (!chars || chars.length === 0) {
            showToast('먼저 캐릭터 설정집에서 캐릭터를 추출해 주세요. 추출된 캐릭터가 있어야 관계도를 생성할 수 있어요.');
            generateBtn.textContent = prevText;
            return;
          }
          showLoadedState(workId);
        })
        .catch((err) => {
          console.error('[relationship load chars]', err);
          showToast('캐릭터를 불러오지 못했어요: ' + err.message);
          generateBtn.textContent = prevText;
        })
        .finally(() => { generateBtn.disabled = false; });
      return;
    }

    // 관계도 생성하기
    const workId  = selectedWorkId; // 클로저 스냅샷 (드롭다운 변경 영향 방지)
    const existing = mockDiagrams[workId] || [];
    if (existing.length >= MAX_DIAGRAMS) {
      showToast('※ 캐릭터 관계도는 최대 3개까지 생성 가능합니다.');
      return;
    }

    try {
      await spendCredit('relationship_diagram');
    } catch (error) {
      if (window.AppUI && /부족/.test(error.message)) AppUI.creditModal();
      else showToast(`※ ${error.message}`);
      return;
    }

    // 로딩 행 추가 + 카운트 즉시 N+1로 업데이트 (시각적 일치)
    resultCount.textContent = `${existing.length + 1} / ${MAX_DIAGRAMS} 개`;
    emptyState.style.display = 'none';
    diagList.style.display   = 'flex';
    diagList.insertAdjacentHTML('afterbegin', `
      <div class="rel-row-loading" id="relLoadingRow">
        <div class="rel-spinner"></div>
        <span>생성 중</span>
      </div>
    `);
    generateBtn.disabled = true;
    runRelGenerate(workId);
  });

  // 모델 서버 응답 구조 확인용 RAW 박스
  function showRelDebug(html) {
    let box = document.getElementById('relDebugBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'relDebugBox';
      box.style.cssText = 'margin-top:16px;padding:16px;border:1px solid var(--color-border,#cfc3fb);' +
        'border-radius:12px;background:var(--color-surface,#fff);font-size:13px;';
      (diagList?.parentNode || document.body).appendChild(box);
    }
    box.innerHTML = html;
  }
  function escRel(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 저장된 관계도 content(문자열/객체/JSON문자열)에서 실제 HTML 문자열을 뽑아낸다.
  function toRelHtml(content) {
    if (!content) return '';
    if (typeof content === 'object') {
      return content.html || content.relation_html || content.relationMapHtml || '';
    }
    const s = String(content);
    const t = s.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try { const o = JSON.parse(t); if (o && (o.html || o.relation_html)) return o.html || o.relation_html; } catch (e) { /* not json */ }
    }
    return s;  // 이미 HTML 문자열
  }

  // 모델 서버 relationship-map 응답에서 관계도 HTML을 찾아낸다(필드명 불확실 → 재귀 탐색).
  function extractRelContent(result) {
    if (!result) return '';
    const direct = [
      result.html,
      result.data && result.data.html,
      result.result && result.result.html,
      result.map_content && result.map_content.html,
    ];
    for (const c of direct) {
      if (typeof c === 'string' && c.indexOf('<') !== -1) return c;
    }
    let found = '';
    (function walk(o) {
      if (found || o == null) return;
      if (typeof o === 'string') {
        if (o.indexOf('<') !== -1 && o.indexOf('>') !== -1 && o.length > 40) found = o;
        return;
      }
      if (typeof o === 'object') {
        for (const k in o) { walk(o[k]); if (found) return; }
      }
    })(result);
    return found;
  }

  async function runRelGenerate(workId) {
    if (!window.REL_CONFIG || !window.REL_CONFIG.generateUrl) { showToast('※ 설정 오류로 관계도를 생성할 수 없습니다.'); generateBtn.disabled = false; return; }
    // 생성 중에는 상단의 로딩 박스(rel-row-loading)를 그대로 유지
    try {
      const res = await fetch(window.REL_CONFIG.generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.REL_CONFIG.csrfToken },
        body: JSON.stringify({
          workId,
          characterIds: Array.from(selectedCharIds),
        }),
      });
      const data = await res.json();
      console.log('[relationship-map] HTTP', res.status, data);
      if (!data.ok) {
        document.getElementById('relLoadingRow')?.remove();
        showRelDebug(
          '<p style="font-weight:700;margin-bottom:6px;">관계도를 생성하지 못했어요</p>' +
          '<p style="color:#ff2d55;margin:0 0 10px;line-height:1.6;">' + escRel(data.error || ('오류 ' + res.status)) + '</p>' +
          '<details style="font-size:12px;color:var(--color-text-muted,#8a8a99);"><summary style="cursor:pointer;">자세히 (개발용)</summary>' +
          '<pre style="white-space:pre-wrap;word-break:break-all;line-height:1.6;max-height:320px;overflow:auto;margin:8px 0 0;">' +
          escRel(JSON.stringify(data, null, 2)) + '</pre></details>'
        );
        return;
      }
      document.getElementById('relLoadingRow')?.remove();
      document.getElementById('relDebugBox')?.remove();
      const html = extractRelContent(data.result);
      if (!html) {
        showRelDebug(
          '<p style="font-weight:700;margin-bottom:6px;">관계도 HTML을 찾지 못했어요</p>' +
          '<p style="color:#ff2d55;margin:0 0 10px;">응답에 HTML 형식의 관계도가 없습니다.</p>' +
          '<details style="font-size:12px;color:var(--color-text-muted,#8a8a99);"><summary style="cursor:pointer;">자세히 (개발용)</summary>' +
          '<pre style="white-space:pre-wrap;word-break:break-all;max-height:320px;overflow:auto;margin:8px 0 0;">' +
          escRel(JSON.stringify(data.result, null, 2)) + '</pre></details>'
        );
        return;
      }
      // 새 관계도를 목록 맨 앞에 추가하고 상세 모달로 바로 보여줌
      const list = mockDiagrams[workId] || (mockDiagrams[workId] = []);
      const newVersion = list.reduce((m, d) => Math.max(m, d.version || 0), 0) + 1;
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const createdAt = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      // 모델 서버가 저장한 실제 map_id를 받아 id로 사용 → 새로고침 전에도 서버 삭제 가능
      const pr = (data.result && (data.result.persistedRelationMap || data.result.persisted)) || {};
      const mapId = pr.map_id || pr.id;
      const newDiag = { id: mapId ? ('db_' + mapId) : ('gen_' + Date.now()), version: newVersion, createdAt, content: html };
      list.unshift(newDiag);
      renderList(workId);
      openDetailModal(newDiag);
    } catch (err) {
      console.error('[relationship-map] error', err);
      document.getElementById('relLoadingRow')?.remove();
      showRelDebug('<p style="color:#ff2d55;">네트워크 오류가 발생했습니다. 콘솔을 확인하세요.</p>');
    } finally {
      generateBtn.disabled = false;
    }
  }

  // ---------- 등장인물 모달 ----------
  const charBackdrop  = document.getElementById('relCharBackdrop');
  const charModal     = document.getElementById('relCharModal');
  const charClose     = document.getElementById('relCharClose');
  const charList      = document.getElementById('relCharList');
  const charSelCount  = document.getElementById('relCharSelCount');
  const charConfirm   = document.getElementById('relCharConfirm');

  function openCharModal() {
    renderCharList();
    charBackdrop.classList.add('open');
    charModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCharModal() {
    charBackdrop.classList.remove('open');
    charModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderCharList() {
    const chars = loadedChars[selectedWorkId] || mockCharacters[selectedWorkId] || [];
    charList.innerHTML = '';

    chars.forEach(char => {
      const checked  = selectedCharIds.has(char.id);
      const maxed    = !checked && selectedCharIds.size >= MAX_CHARS;
      const rowClass = ['rel-char-row', checked ? 'checked' : '', maxed ? 'disabled' : ''].filter(Boolean).join(' ');

      charList.insertAdjacentHTML('beforeend', `
        <div class="${rowClass}" data-id="${char.id}">
          <div class="rel-char-checkbox">${checked ? SVG_CHECK : ''}</div>
          <span class="rel-char-name">${char.name}</span>
          <span class="rel-role-badge ${char.role}">${char.role}</span>
        </div>
      `);
    });

    updateCharCount(chars.length);
  }

  function updateCharCount(total) {
    const totalCount = total ?? (loadedChars[selectedWorkId] || mockCharacters[selectedWorkId] || []).length;
    charSelCount.textContent = `총 ${totalCount}명 중 ${selectedCharIds.size}명 선택됨`;
  }

  charList?.addEventListener('click', (e) => {
    const row = e.target.closest('.rel-char-row');
    if (!row || row.classList.contains('disabled')) return;

    const id = row.dataset.id;
    if (selectedCharIds.has(id)) {
      selectedCharIds.delete(id);
    } else {
      if (selectedCharIds.size >= MAX_CHARS) return;
      selectedCharIds.add(id);
    }
    renderCharList();
  });

  charLinkBtn?.addEventListener('click', openCharModal);
  charClose?.addEventListener('click', closeCharModal);
  charBackdrop?.addEventListener('click', closeCharModal);

  charConfirm?.addEventListener('click', () => {
    closeCharModal();
    // 선택된 캐릭터 수 업데이트 반영
    statPersons.textContent = `${selectedCharIds.size}명`;
  });

  // ---------- 관계도 상세 조회 모달 ----------
  const detailBackdrop   = document.getElementById('relDetailBackdrop');
  const detailModal      = document.getElementById('relDetailModal');
  const detailTitle      = document.getElementById('relDetailTitle');
  const detailDate       = document.getElementById('relDetailDate');
  const detailFrame      = document.getElementById('relDetailFrame');
  const detailClose      = document.getElementById('relDetailClose');
  const detailDeleteBtn  = document.getElementById('relDetailDeleteBtn');
  const detailPdfBtn     = document.getElementById('relDetailPdfBtn');
  let   detailTargetId   = null;

  function openDetailModal(diag) {
    detailTargetId          = diag.id;
    detailTitle.textContent = `관계도 ver.${diag.version}`;
    detailDate.textContent  = `생성일시  ${diag.createdAt}`;
    detailFrame.removeAttribute('src');
    detailFrame.srcdoc = '';
    const html = toRelHtml(diag.content);
    // 인라인 HTML이면 srcdoc, 아니면 URL(src)로 렌더
    setTimeout(() => {
      if (html) detailFrame.srcdoc = html;
      else detailFrame.src = diag.htmlUrl || '';
    }, 0);
    detailBackdrop.classList.add('open');
    detailModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    detailBackdrop.classList.remove('open');
    detailModal.classList.remove('open');
    document.body.style.overflow = '';
    detailFrame.src  = '';
    detailTargetId   = null;
  }

  diagList?.addEventListener('click', (e) => {
    const row = e.target.closest('.rel-diagram-row');
    if (!row) return;
    const diag = (mockDiagrams[selectedWorkId] || []).find(d => d.id === row.dataset.id);
    if (diag) openDetailModal(diag);
  });

  // iframe 로드 후 처리 (zoom CSS는 Cytoscape 좌표와 충돌하여 제거)
  detailFrame?.addEventListener('load', () => {
    try {
      const doc = detailFrame.contentDocument || detailFrame.contentWindow?.document;
      if (!doc || !doc.head) return;
      // 기존 주입 스타일 제거
      doc.getElementById('__rel-zoom')?.remove();
      const style = doc.createElement('style');
      style.id = '__rel-zoom';
      style.textContent = 'body { overflow-x: hidden !important; }';
      doc.head.appendChild(style);
    } catch (e) { /* cross-origin 등 예외 무시 */ }
  });

  detailClose?.addEventListener('click', closeDetailModal);
  detailBackdrop?.addEventListener('click', closeDetailModal);

  // ---------- iframe → 부모 메시지 수신 ----------
  // rel-ready : Cytoscape 렌더 완료 → PDF 캡처 타이밍
  // rel-positions : 노드 드래그 완료 → RDS 위치 저장
  let pdfReadyResolve = null;
  let pdfFrame = null; // 현재 PDF 캡처 중인 iframe 참조
  window.addEventListener('message', (e) => {
    if (!e.data || typeof e.data !== 'object') return;
    // rel-ready: PDF iframe에서 온 신호만 캡처 타이밍으로 사용
    if (e.data.type === 'rel-ready' && pdfReadyResolve && pdfFrame && e.source === pdfFrame.contentWindow) {
      const r = pdfReadyResolve; pdfReadyResolve = null; r();
    }
    // rel-positions: detail frame에서 온 신호만 위치 저장에 사용
    if (e.data.type === 'rel-positions' && e.data.positions && detailTargetId && selectedWorkId
        && detailFrame && e.source === detailFrame.contentWindow) {
      // 메모리의 mockDiagrams도 즉시 갱신 → 모달 닫았다 열어도 위치 유지
      const diag = (mockDiagrams[selectedWorkId] || []).find(d => d.id === detailTargetId);
      if (diag && diag.content) {
        diag.content = String(diag.content).replace(
          /window\.__REL_POSITIONS__\s*=\s*[^;]+;/,
          'window.__REL_POSITIONS__=' + JSON.stringify(e.data.positions) + ';'
        );
      }
      const m = /^db_(\d+)$/.exec(String(detailTargetId));
      if (!m || !window.REL_CONFIG?.positionsUrl) return;
      const url = window.REL_CONFIG.positionsUrl.replace('/0/', '/' + selectedWorkId + '/');
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.REL_CONFIG.csrfToken },
        body: JSON.stringify({ mapId: m[1], positions: e.data.positions }),
      }).catch(err => console.error('[rel positions]', err));
    }
  });

  detailPdfBtn?.addEventListener('click', () => {
    const diag = (mockDiagrams[selectedWorkId] || []).find(d => d.id === detailTargetId);
    const html = toRelHtml(diag && diag.content);
    if (!html) { showToast('※ 이 관계도에는 다운로드할 내용이 없습니다.'); return; }

    // 화면 밖 iframe에 관계도 HTML을 렌더 후 캡처
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1240px;height:1600px;border:0;';
    frame.srcdoc = html;
    document.body.appendChild(frame);
    pdfFrame = frame; // PDF iframe 참조 저장

    const oldText = detailPdfBtn.textContent;
    detailPdfBtn.disabled = true;
    detailPdfBtn.textContent = 'PDF 생성 중...';
    const finish = () => { detailPdfBtn.disabled = false; detailPdfBtn.textContent = oldText; pdfFrame = null; frame.remove(); };

    frame.onload = async () => {
      const doc = frame.contentDocument;
      const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
      if (!window.html2canvas || !jsPDFCtor || !doc) {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); }
        catch (e) { showToast('※ PDF 기능을 사용할 수 없습니다.'); }
        detailPdfBtn.disabled = false; detailPdfBtn.textContent = oldText;
        setTimeout(() => frame.remove(), 60000);
        return;
      }
      try {
        if (doc.fonts && doc.fonts.ready) { try { await doc.fonts.ready; } catch (e) {} }
        // Cytoscape 렌더 완료(rel-ready) 신호 대기 — 최대 8초 타임아웃
        await new Promise(r => { pdfReadyResolve = r; setTimeout(r, 8000); });
        // 콘텐츠 전체 폭/높이로 캡처 → 우측 잘림 방지
        const fullWidth  = Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth, 1);
        const fullHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 1);
        const canvas = await window.html2canvas(doc.body, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff',
          windowWidth: fullWidth, width: fullWidth, height: fullHeight, scrollX: 0, scrollY: 0,
        });
        const pdf = new jsPDFCtor({ unit: 'pt', format: 'a4', orientation: 'portrait' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = canvas.height * (imgW / canvas.width);
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        let heightLeft = imgH, position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pageH;
        while (heightLeft > 0) {
          position -= pageH;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
          heightLeft -= pageH;
        }
        pdf.save(`관계도_ver${diag ? diag.version : ''}.pdf`);
        finish();
      } catch (e) {
        console.error('[rel pdf]', e);
        showToast('※ PDF 생성에 실패했습니다.');
        finish();
      }
    };
  });

  // 상세 모달 내 삭제 버튼 → 삭제 확인 모달 열기
  detailDeleteBtn?.addEventListener('click', () => {
    deleteTargetId = detailTargetId;
    deleteBackdrop.classList.add('open');
    deleteModal.classList.add('open');
  });

  // ---------- 삭제 모달 ----------
  const deleteBackdrop = document.getElementById('relDeleteBackdrop');
  const deleteModal    = document.getElementById('relDeleteModal');
  const deleteCancel   = document.getElementById('relDeleteCancel');
  const deleteConfirm  = document.getElementById('relDeleteConfirm');
  const toast          = document.getElementById('relToast');
  let deleteTargetId   = null;

  function closeDeleteModal() {
    deleteBackdrop.classList.remove('open');
    deleteModal.classList.remove('open');
    deleteTargetId = null;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  deleteCancel?.addEventListener('click', closeDeleteModal);
  deleteBackdrop?.addEventListener('click', closeDeleteModal);
  deleteConfirm?.addEventListener('click', async () => {
    const targetId = deleteTargetId;
    closeDeleteModal();
    closeDetailModal();

    // 서버(RDS)에서 실제 삭제 — DB 저장본은 'db_<map_id>' 형태
    const m = /^db_(\d+)$/.exec(String(targetId || ''));
    if (m && window.REL_CONFIG?.deleteUrl && selectedWorkId) {
      try {
        const url = window.REL_CONFIG.deleteUrl.replace('/0/', '/' + selectedWorkId + '/');
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.REL_CONFIG.csrfToken },
          body: JSON.stringify({ mapId: m[1] }),
        });
        const data = await res.json();
        if (!data.ok) { showToast('※ ' + (data.error || '관계도 삭제에 실패했습니다.')); return; }
      } catch (e) {
        console.error('[relationship delete]', e);
        showToast('※ 관계도 삭제 중 오류가 발생했습니다.');
        return;
      }
    }

    if (selectedWorkId && mockDiagrams[selectedWorkId]) {
      mockDiagrams[selectedWorkId] = mockDiagrams[selectedWorkId].filter(d => d.id !== targetId);
    }
    renderList(selectedWorkId);
    showToast('※ 캐릭터 관계도가 삭제되었습니다.');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDeleteModal();
      closeDetailModal();
      closeCharModal();
    }
  });

  // ---------- 초기화 ----------
  resetList();

});