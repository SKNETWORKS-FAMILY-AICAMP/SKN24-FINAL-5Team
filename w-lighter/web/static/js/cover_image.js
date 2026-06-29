// cover_image.js — 표지 이미지 생성 페이지

document.addEventListener('DOMContentLoaded', () => {

  // ---------- 아이콘 SVG ----------
  const SVG_STAR_EMPTY  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  const SVG_STAR_FILLED = `<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

  // ---------- Mock 데이터 (작품별 기생성 표지, 최신순) ----------
  // TODO: 실제 API 연동 시 이 객체를 서버 응답으로 교체
  const MAX_COVERS = 5;
  const mockCovers = {
    '1': [
      { id: 'c1', url: '', createdAt: '2025-06-18' },
      { id: 'c2', url: '', createdAt: '2025-06-17' },
      { id: 'c3', url: '', createdAt: '2025-06-16' },
      { id: 'c4', url: '', createdAt: '2025-06-15' },
    ],
    '2': [
      { id: 'c5', url: '', createdAt: '2025-06-19' },
      { id: 'c6', url: '', createdAt: '2025-06-18' },
    ],
    '3': [],
    '4': [
      { id: 'c7', url: '', createdAt: '2025-06-20' },
    ],
  };

  // ---------- 우측 패널 렌더링 ----------
  const emptyState  = document.getElementById('coverEmptyState');
  const imageGrid   = document.getElementById('coverImageGrid');
  const resultCount = document.getElementById('coverResultCount');

  function renderGrid(workId) {
    const covers = mockCovers[workId] || [];
    const emptySlots = MAX_COVERS - covers.length;

    resultCount.textContent = `${covers.length} / ${MAX_COVERS} 장`;

    if (covers.length === 0) {
      // 생성된 이미지 없음 → empty state
      emptyState.style.display = '';
      imageGrid.style.display  = 'none';
      return;
    }

    // 이미지 있음 → 그리드
    emptyState.style.display = 'none';
    imageGrid.style.display  = 'grid';
    imageGrid.innerHTML = '';

    // 빈 슬롯: 5개 미만이면 1개만, 5개면 표시 안 함
    if (covers.length < MAX_COVERS) {
      imageGrid.insertAdjacentHTML('beforeend', `
        <div class="cover-slot-empty">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>빈 슬롯</span>
        </div>
      `);
    }

    // 생성 중이고 현재 그리드가 생성 중인 작품이면 로딩 슬롯 유지
    if (isGenerating && workId === generatingWorkId) {
      const emptySlot = imageGrid.querySelector('.cover-slot-empty');
      if (emptySlot) {
        emptySlot.outerHTML = '<div class="cover-slot-loading" id="coverLoadingSlot"><div class="cover-spinner"></div><span>생성 중</span></div>';
      } else if (!imageGrid.querySelector('#coverLoadingSlot')) {
        imageGrid.insertAdjacentHTML('afterbegin', '<div class="cover-slot-loading" id="coverLoadingSlot"><div class="cover-spinner"></div><span>생성 중</span></div>');
      }
    }

    // 이미지 카드 (최신순)
    covers.forEach((cover) => {
      const imgContent = cover.url
        ? `<img src="${cover.url}" alt="생성된 표지">`
        : `<div style="width:100%;height:100%;background:linear-gradient(145deg,#e9e1ff,#c4b5f4);display:flex;align-items:center;justify-content:center;">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9a84e6" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 3v18M8 7h4M8 11h3"/></svg>
           </div>`;

      imageGrid.insertAdjacentHTML('beforeend', `
        <div class="cover-img-card">
          <div class="cover-img-wrap">
            ${imgContent}
            <div class="cover-img-overlay">
              <div class="cover-img-actions">
                <!-- 확대 -->
                <button class="cover-img-icon-btn" title="확대" data-action="expand" data-id="${cover.id}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
                <!-- 삭제 -->
                <button class="cover-img-icon-btn danger" title="삭제" data-action="delete" data-id="${cover.id}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
                <!-- 대표 이미지 설정 -->
                <button class="cover-img-icon-btn${cover.isMain ? ' active' : ''}" title="대표 이미지 설정" data-action="setMain" data-id="${cover.id}">
                  ${cover.isMain ? SVG_STAR_FILLED : SVG_STAR_EMPTY}
                </button>
              </div>
            </div>
          </div>
        </div>
      `);
    });
  }

  function resetGrid() {
    resultCount.textContent = `0 / ${MAX_COVERS} 장`;
    emptyState.style.display = '';
    imageGrid.style.display  = 'none';
    imageGrid.innerHTML = '';
  }

  // ---------- 작품 드롭다운 ----------
  const selectWrap    = document.getElementById('workSelectWrap');
  const selectTrigger = document.getElementById('workSelectTrigger');
  const selectText    = document.getElementById('workSelectText');
  const dropdown      = document.getElementById('workDropdown');
  const dropdownItems = dropdown?.querySelectorAll('.cover-dropdown-item');

  let selectedWorkId = null;
  let isGenerating = false;
  let generatingWorkId = null;

  const chevron = document.getElementById('workSelectChevron');
  const SVG_DOWN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const SVG_UP   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;

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

      // 선택 표시
      dropdownItems.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      // 트리거 텍스트 업데이트
      selectText.textContent = title;
      selectText.classList.add('selected');

      // 아이콘: 썸네일 있으면 2:3 이미지
      const iconWrap = selectTrigger.querySelector('.cover-select-icon');
      const thumbEl  = item.querySelector('.cover-di-img');
      if (thumbEl?.src && !thumbEl.src.endsWith('/')) {
        iconWrap.innerHTML = `<img src="${thumbEl.src}" alt="${title}">`;
      } else {
        // 표지 없는 작품 → 기본 아이콘으로 복원(이전 작품 표지 잔상 제거)
        iconWrap.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 3v18M8 7h4M8 11h3"/></svg>';
      }

      // 닫기
      selectWrap.classList.remove('open');
      selectTrigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;

      // 우측 패널: 저장된 표지 불러와서 렌더
      loadSavedCovers(selectedWorkId);
    });
  });

  // ===== 저장된 표지 불러오기 (작품 선택 시) =====
  async function loadSavedCovers(workId) {
    document.getElementById('coverDebugBox')?.remove();
    if (window.COVER_CONFIG?.savedUrl) {
      const url = window.COVER_CONFIG.savedUrl.replace('/0/', '/' + workId + '/');
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.ok && Array.isArray(data.covers)) {
          mockCovers[workId] = data.covers.map(c => ({
            id: 'db_' + c.id, url: c.url, createdAt: c.createdAt, isMain: c.isMain,
          }));
        }
      } catch (e) {
        console.error('[load covers]', e);
      }
    }
    renderGrid(workId);
  }

  // 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!selectWrap?.contains(e.target)) {
      selectWrap?.classList.remove('open');
      selectTrigger?.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;
    }
  });

  // ---------- 국가 칩 ----------
  const countryChips = document.querySelectorAll('.cover-country-chip');
  let selectedCountry = 'KR';

  countryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      countryChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedCountry = chip.dataset.country;
    });
  });

  // ---------- 글자수 카운터 ----------
  const textarea = document.getElementById('coverPrompt');
  const counter  = document.getElementById('coverCounter');

  textarea?.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = `${len.toLocaleString('ko-KR')} / 500`;
  });

  // ---------- 생성 버튼 ----------
  const generateBtn = document.getElementById('coverGenerateBtn');
  const creditChip = document.querySelector('.credit-chip[data-credit-use-url]');

  // 모델 서버 응답 구조 확인용 RAW 박스
  function showCoverDebug(html) {
    let box = document.getElementById('coverDebugBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'coverDebugBox';
      box.style.cssText = 'margin-top:16px;padding:16px;border:1px solid var(--color-border,#cfc3fb);' +
        'border-radius:12px;background:var(--color-surface,#fff);font-size:13px;';
      (imageGrid?.parentNode || document.body).appendChild(box);
    }
    box.innerHTML = html;
  }
  function escCover(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 모델 응답에서 표지 이미지 표시용 URL 만들기
  // 1순위: image_base64 → data URI, 2순위: S3 공개 URL
  const S3_REGION = 'ap-northeast-2';
  function coverImageUrl(r) {
    if (r.s3Bucket && r.s3Key) {
      return 'https://' + r.s3Bucket + '.s3.' + S3_REGION + '.amazonaws.com/' + r.s3Key;
    }
    if (r.s3Uri && r.s3Uri.startsWith('s3://')) {
      const rest = r.s3Uri.slice('s3://'.length);
      const slash = rest.indexOf('/');
      if (slash > 0) {
        return 'https://' + rest.slice(0, slash) + '.s3.' + S3_REGION + '.amazonaws.com/' + rest.slice(slash + 1);
      }
    }
    if (r.image_base64) return 'data:image/png;base64,' + r.image_base64;
    return '';
  }

  // 크레딧 차감 (팀 dev 브랜치)
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

  generateBtn?.addEventListener('click', async () => {
    if (!selectedWorkId) {
      showToast('※ 작품을 먼저 선택해 주세요.');
      return;
    }
    const selItem = document.querySelector('.cover-dropdown-item[data-id="' + selectedWorkId + '"]');
    if (selItem && selItem.dataset.synopsis === 'false') {
      showToast('이 작품은 시놉시스가 없어 표지를 생성할 수 없어요. 시놉시스를 먼저 입력해 주세요.');
      return;
    }
    if (!window.COVER_CONFIG || !window.COVER_CONFIG.generateUrl) { showToast('※ 설정 오류로 표지를 생성할 수 없습니다.'); return; }

    const covers = mockCovers[selectedWorkId] || [];
    if (covers.length >= MAX_COVERS) {
      showToast('※ 최대 5개까지 저장 가능합니다. 기존 항목을 삭제 후 다시 시도해주세요.');
      return;
    }

    // 크레딧 차감 (부족하면 생성 불가)
    try {
      await spendCredit('cover_image');
    } catch (error) {
      if (window.AppUI && /부족/.test(error.message)) AppUI.creditModal();
      else showToast(`※ ${error.message}`);
      return;
    }

    isGenerating = true;
    generatingWorkId = selectedWorkId;
    generateBtn.disabled = true;
    showGeneratingBanner();
    // "생성 중" 로딩: 빈 슬롯 자리를 로딩으로 교체 (없으면 그리드에 추가)
    document.getElementById('coverDebugBox')?.remove();
    const loadingHTML = '<div class="cover-slot-loading" id="coverLoadingSlot"><div class="cover-spinner"></div><span>생성 중</span></div>';
    const emptySlot = imageGrid.querySelector('.cover-slot-empty');
    if (emptySlot) {
      emptySlot.outerHTML = loadingHTML;
    } else {
      emptyState.style.display = 'none';
      imageGrid.style.display = 'grid';
      if (!imageGrid.querySelector('.cover-img-card')) imageGrid.innerHTML = '';
      imageGrid.insertAdjacentHTML('beforeend', loadingHTML);
    }

    try {
      const res = await fetch(window.COVER_CONFIG.generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.COVER_CONFIG.csrfToken,
        },
        body: JSON.stringify({
          workId: selectedWorkId,
          targetCountry: selectedCountry,
          userPrompt: (document.getElementById('coverPrompt')?.value || '').trim(),
          dryRun: false,
        }),
      });
      const data = await res.json();
      console.log('[cover] HTTP', res.status, data);

      if (!data.ok) {
        showToast('※ ' + (data.error || ('표지 생성에 실패했습니다 (' + res.status + ')')));
        return;
      }
      const r = data.result || {};
      const imgUrl = coverImageUrl(r);
      if (!imgUrl) {
        showToast('※ 표지 이미지를 받지 못했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      // 모델 서버가 저장한 실제 cover_id를 받아 id로 사용 → 새로고침 전에도 서버 삭제 가능
      const pc = r.persistedCover || {};
      const coverId = pc.cover_id || pc.id;
      mockCovers[selectedWorkId] = [{ id: coverId ? ('db_' + coverId) : ('cv_' + Date.now()), url: imgUrl, createdAt: dateStr }, ...(mockCovers[selectedWorkId] || [])];
    } catch (err) {
      console.error('[cover] error', err);
      showToast('※ 네트워크 오류가 발생했습니다.');
    } finally {
      isGenerating = false;
      generateBtn.disabled = false;
      hideGeneratingBanner();
      document.getElementById('coverLoadingSlot')?.remove();
      renderGrid(generatingWorkId);
      generatingWorkId = null;
    }
  });

  // ---------- 이미지 그리드 이벤트 (이벤트 위임) ----------
  imageGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.cover-img-icon-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'setMain') {
      // 기존 대표 별 모두 해제
      imageGrid.querySelectorAll('[data-action="setMain"]').forEach(b => {
        b.innerHTML = SVG_STAR_EMPTY;
        b.classList.remove('active');
      });
      // 클릭한 별 채우기
      btn.innerHTML = SVG_STAR_FILLED;
      btn.classList.add('active');

      // 커버 URL 찾기
      const card   = btn.closest('.cover-img-card');
      const imgEl  = card?.querySelector('img');
      const imgUrl = imgEl?.src || '';
      if (imgUrl.startsWith('data:image/')) {
        showToast('대표 이미지 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      // 로컬 상태(mockCovers)에도 대표 표시 반영 → 새로고침 전까지 유지
      (mockCovers[selectedWorkId] || []).forEach(c => { c.isMain = (c.id === id); });

      // 작품 선택 드롭다운/트리거 썸네일을 새 대표 이미지로 즉시 갱신 (라이브 반영)
      const opt = document.querySelector('.cover-dropdown-item[data-id="' + selectedWorkId + '"]');
      const thumb = opt?.querySelector('.cover-di-thumb');
      if (thumb) {
        thumb.innerHTML = '<img class="cover-di-img" src="' + imgUrl + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
      }
      const triggerIcon = document.querySelector('.cover-select-icon');
      if (triggerIcon) {
        triggerIcon.innerHTML = '<img src="' + imgUrl + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">';
      }

      const csrf   = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] ?? '';
      const fd     = new FormData();
      fd.append('url', imgUrl);
      fd.append('csrfmiddlewaretoken', csrf);
      fetch('/works/' + selectedWorkId + '/set-cover/', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(d => { showToast(d.ok ? '대표 이미지로 설정되었습니다. 내 서재에도 반영돼요.' : '※ 대표 이미지 저장에 실패했습니다.'); })
        .catch(e => { console.error('대표 이미지 저장 오류:', e); showToast('※ 대표 이미지 저장에 실패했습니다.'); });
    }

    if (action === 'delete') {
      openDeleteModal(id);
    }

    if (action === 'expand') {
      const card    = btn.closest('.cover-img-card');
      const imgEl   = card?.querySelector('img');
      const imgSrc  = imgEl?.src || '';
      openPreview(imgSrc);
    }
  });

  // ---------- 삭제 확인 모달 ----------
  const deleteBackdrop  = document.getElementById('coverDeleteBackdrop');
  const deleteModal     = document.getElementById('coverDeleteModal');
  const deleteCancel    = document.getElementById('coverDeleteCancel');
  const deleteConfirm   = document.getElementById('coverDeleteConfirm');
  const toast           = document.getElementById('coverToast');
  let deleteTargetId    = null;

  function openDeleteModal(id) {
    deleteTargetId = id;
    deleteBackdrop.classList.add('open');
    deleteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDeleteModal() {
    deleteBackdrop.classList.remove('open');
    deleteModal.classList.remove('open');
    document.body.style.overflow = '';
    deleteTargetId = null;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function showGeneratingBanner() {
    let banner = document.getElementById('coverGeneratingBanner');
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'coverGeneratingBanner';
    banner.className = 'cover-generating-banner';
    banner.innerHTML = '<div class="cover-spinner" style="width:16px;height:16px;border-width:2px;"></div><span>이미지 생성 중입니다. 다른 작업을 하셔도 생성이 계속됩니다.</span>';
    document.querySelector('.cover-right')?.prepend(banner);
  }

  function hideGeneratingBanner() {
    document.getElementById('coverGeneratingBanner')?.remove();
  }

  deleteCancel?.addEventListener('click', closeDeleteModal);
  deleteBackdrop?.addEventListener('click', closeDeleteModal);

  deleteConfirm?.addEventListener('click', async () => {
    // 대표 이미지인지 확인
    const targetBtn = imageGrid?.querySelector(`[data-action="setMain"][data-id="${deleteTargetId}"]`);
    const isMain    = targetBtn?.classList.contains('active');
    const targetId  = deleteTargetId;

    closeDeleteModal();

    if (isMain) {
      showToast('※ 대표 표지 이미지는 삭제할 수 없습니다.');
      return;
    }

    // 서버(RDS)에서 실제 삭제 — DB 저장본은 'db_<cover_id>' 형태
    const dbm = /^db_(\d+)$/.exec(String(targetId || ''));
    if (dbm && window.COVER_CONFIG?.deleteUrl && selectedWorkId) {
      try {
        const url = window.COVER_CONFIG.deleteUrl.replace('/0/', '/' + selectedWorkId + '/');
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.COVER_CONFIG.csrfToken },
          body: JSON.stringify({ coverId: dbm[1] }),
        });
        const data = await res.json();
        if (!data.ok) { showToast('※ ' + (data.error || '표지 삭제에 실패했습니다.')); return; }
      } catch (e) {
        console.error('[cover delete]', e);
        showToast('※ 표지 삭제 중 오류가 발생했습니다.');
        return;
      }
    }

    // 로컬 목록에서도 제거 (문자열로 비교 → 숫자/문자 id 불일치 방지)
    if (selectedWorkId && mockCovers[selectedWorkId]) {
      mockCovers[selectedWorkId] = mockCovers[selectedWorkId].filter(c => String(c.id) !== String(targetId));
    }
    renderGrid(selectedWorkId);
    showToast('※ 선택하신 표지 이미지가 삭제되었습니다.');
  });

  // ---------- 확대 모달 ----------
  const previewBackdrop = document.getElementById('coverPreviewBackdrop');
  const previewModal    = document.getElementById('coverPreviewModal');
  const previewClose    = document.getElementById('coverPreviewClose');
  const previewImgWrap  = document.getElementById('coverPreviewImgWrap');

  function openPreview(src) {
    previewImgWrap.innerHTML = src
      ? `<img src="${src}" alt="표지 이미지">`
      : `<div style="width:100%;height:100%;background:linear-gradient(145deg,#e9e1ff,#c4b5f4);"></div>`;
    previewBackdrop.classList.add('open');
    previewModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePreview() {
    previewBackdrop.classList.remove('open');
    previewModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  previewClose?.addEventListener('click', closePreview);
  previewBackdrop?.addEventListener('click', closePreview);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
  });

  // ---------- 초기 상태 ----------
  resetGrid();

});
