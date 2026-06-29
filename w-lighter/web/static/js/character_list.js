document.addEventListener('DOMContentLoaded', function () {

  // ===== 요소 =====
  const workSelect    = document.getElementById('workSelect');
  const trigger       = document.getElementById('workSelectTrigger');
  const valueEl       = document.getElementById('workSelectValue');
  const dropdown      = document.getElementById('workSelectDropdown');
  const options       = dropdown.querySelectorAll('.work-option');
  const chevron       = document.getElementById('workSelectChevron');
  const extractBtn    = document.getElementById('extractBtn');
  const genreEl = document.getElementById('workSelectGenre');
  const thumbEl = document.getElementById('workSelectThumb');
  const charEmpty     = document.getElementById('charEmpty');
  const charTableWrap = document.getElementById('charTableWrap');
  const tableBody     = charTableWrap.querySelector('tbody');
  const addBtn        = document.getElementById('addCharacterBtn');
  const deleteModal   = document.getElementById('deleteModal');
  const deleteBackdrop = document.getElementById('deleteBackdrop');
  const deleteConfirm = document.getElementById('deleteConfirm');
  const deleteCancel  = document.getElementById('deleteCancel');
  const toastWrap     = document.getElementById('toastWrap');

  const MAX_CHARACTERS = 20;
  let selectedWorkId = null;
  let rowToDelete = null;

  // 편집 가능한 열 (인덱스 → 제약). 1=역할, 7=액션은 편집 안 함
  const FIELDS = {
    0: { label: '이름',    max: 30,   required: true },
    2: { label: '나이',    max: 10 },
    3: { label: '성별',    max: 5 },
    4: { label: '외형',    max: 300,  area: true },
    5: { label: '세부설정', max: 1000, area: true },
    6: { label: '관계요약', max: 500,  area: true },
  };

  // 아이콘 (추가 행에서 재사용)
  const SVG_DOWN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';
  const SVG_UP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>';
  const EDIT_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  const DELETE_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  const ACTION_HTML = '<button class="icon-btn edit-btn" aria-label="수정">' + EDIT_SVG + '</button><button class="icon-btn delete-btn" aria-label="삭제">' + DELETE_SVG + '</button>';

  // ===== 토스트 =====
  function showToast(message) {
    toastWrap.innerHTML = '';  // 기존 토스트 제거 → 한 번에 하나만 표시
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = '※ ' + message;
    toastWrap.appendChild(t);
    setTimeout(function () { t.classList.add('hide'); }, 2000);
    setTimeout(function () { t.remove(); }, 2400);
  }

  // ===== 크레딧 차감 =====
  const creditChip = document.querySelector('.credit-chip');
  function updateCreditBalance(balance) {
    document.querySelectorAll('.credit-chip').forEach(function (el) {
      el.textContent = Number(balance).toLocaleString() + ' C';
    });
  }
  async function spendCredit(feature) {
    const url = creditChip && creditChip.dataset.creditUseUrl;
    const csrf = creditChip && creditChip.dataset.csrf;
    if (!url || !csrf) throw new Error('크레딧 차감 설정을 찾을 수 없습니다.');
    const form = new FormData();
    form.append('feature', feature);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': csrf, 'X-Requested-With': 'XMLHttpRequest' },
      body: form,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      if (typeof data.balance === 'number') updateCreditBalance(data.balance);
      throw new Error(data.message || '크레딧 차감에 실패했습니다.');
    }
    updateCreditBalance(data.balance);
    return data;
  }

  // ===== 작품 드롭다운 =====
  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = workSelect.classList.toggle('open');
    trigger.setAttribute('aria-expanded', isOpen);
    if (chevron) chevron.innerHTML = isOpen ? SVG_UP : SVG_DOWN;
  });
  document.addEventListener('click', function (e) {
    if (!workSelect.contains(e.target)) {
      workSelect.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;
    }
  });
  options.forEach(function (opt) {
    opt.addEventListener('click', function () {
      options.forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      valueEl.textContent = opt.dataset.title;
      valueEl.classList.add('selected');
      genreEl.textContent = opt.dataset.genre;
      selectedWorkId = opt.dataset.workId;

      const thumbImg = opt.querySelector('.char-di-img');
      if (thumbImg?.src && !thumbImg.src.endsWith('/')) {
        thumbEl.innerHTML = '<img src="' + thumbImg.src + '" alt="' + opt.dataset.title + '">';
      } else {
        // 표지 없는 작품 → 기본 아이콘으로 복원(이전 작품 표지 잔상 제거)
        thumbEl.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 3v18M8 7h4M8 11h3"/></svg>';
      }

      workSelect.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;

      loadSavedCharacters(selectedWorkId);
    });
  });

  // ===== 저장된 캐릭터 불러오기 (작품 선택 시) =====
  async function loadSavedCharacters(workId) {
    document.getElementById('charDebugBox')?.remove();
    if (!window.CHAR_CONFIG?.savedUrl) return;
    const url = window.CHAR_CONFIG.savedUrl.replace('/0/', '/' + workId + '/');
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && data.characters && data.characters.length) {
        renderCharacters(data.characters);
      } else {
        // 저장된 캐릭터 없음 → 빈 상태로
        charTableWrap.style.display = 'none';
        resetCharEmpty();
        charEmpty.style.display = '';
      }
    } catch (e) {
      console.error('[load characters]', e);
    }
  }

  // ===== 추출 (모델 서버 호출 → 응답 구조 확인용 RAW 표시) =====
  function ensureDebugBox() {
    let box = document.getElementById('charDebugBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'charDebugBox';
      (charTableWrap.parentNode || document.body).insertBefore(box, charTableWrap);
    }
    return box;
  }
  function showDebug(html) {
    const box = ensureDebugBox();
    box.style.cssText = 'margin-top:16px;padding:16px;border:1px solid var(--color-border,#cfc3fb);' +
      'border-radius:12px;background:var(--color-surface,#fff);';
    box.innerHTML = html;
  }
  function showCharLoading() {
    charEmpty.style.display = '';
    charEmpty.innerHTML = '<div class="char-loading"><div class="char-spinner"></div><span>생성 중</span></div>';
    charEmpty.style.border = 'none';
    charEmpty.style.padding = '0';
  }

  function resetCharEmpty() {
    charEmpty.style.border = '';
    charEmpty.style.padding = '';
    charEmpty.innerHTML =
      '<div class="char-empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>' +
      '<p class="char-empty-title">아직 추출된 캐릭터 설정이 없어요</p>' +
      '<p class="char-empty-desc">작품을 선택하고 \'캐릭터 설정 추출하기\'를 눌러주세요.</p>';
  }

  // ===== 재추출 확인 모달 =====
  const reExtractBackdrop = document.getElementById('reExtractBackdrop');
  const reExtractModal    = document.getElementById('reExtractModal');
  const reExtractCancel   = document.getElementById('reExtractCancel');
  const reExtractConfirm  = document.getElementById('reExtractConfirm');

  function openReExtractModal() {
    reExtractBackdrop.classList.add('open');
    reExtractModal.classList.add('open');
  }
  function closeReExtractModal() {
    reExtractBackdrop.classList.remove('open');
    reExtractModal.classList.remove('open');
  }
  reExtractCancel?.addEventListener('click', closeReExtractModal);
  reExtractBackdrop?.addEventListener('click', closeReExtractModal);
  reExtractConfirm?.addEventListener('click', () => {
    closeReExtractModal();
    doExtract();
  });

  extractBtn.addEventListener('click', async function () {
    if (!selectedWorkId) { showToast('작품을 먼저 선택해주세요.'); return; }
    const selItem = document.querySelector('.work-option[data-work-id="' + selectedWorkId + '"]');
    if (selItem && selItem.dataset.synopsis === 'false') {
      showToast('이 작품은 시놉시스가 없어 캐릭터 설정을 추출할 수 없어요. 시놉시스를 먼저 입력해 주세요.');
      return;
    }
    if (!window.CHAR_CONFIG || !window.CHAR_CONFIG.extractUrl) { showToast('설정 오류: extractUrl 없음'); return; }

    // 기존 캐릭터가 있으면 재추출 확인 모달
    const hasChars = tableBody && tableBody.querySelectorAll('tr').length > 0;
    if (hasChars) { openReExtractModal(); return; }

    doExtract();
  });

  async function doExtract() {

    // 요약 통계 초기화
    ['statTotal', 'statLead', 'statSupport', 'statMinor'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '0<small>명</small>';
    });

    // 크레딧 차감 (부족하면 추출 불가)
    try {
      await spendCredit('character_extract');
    } catch (error) {
      if (window.AppUI && /부족/.test(error.message)) AppUI.creditModal();
      else showToast(error.message);
      return;
    }

    charEmpty.style.display = 'none';
    charTableWrap.style.display = 'none';
    extractBtn.disabled = true;
    showCharLoading();

    try {
      const res = await fetch(window.CHAR_CONFIG.extractUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CHAR_CONFIG.csrfToken,
        },
        body: JSON.stringify({ workId: selectedWorkId }),
      });
      const data = await res.json();

      console.log('[character-extract] HTTP', res.status, data);

      if (!data.ok) {
        showDebug(
          '<p style="font-weight:700;margin-bottom:6px;color:var(--color-text,#2b2440);">캐릭터를 추출하지 못했어요</p>' +
          '<p style="color:#ff2d55;margin:0 0 10px;line-height:1.6;">' + escapeAttr(data.error || ('오류 ' + res.status)) + '</p>' +
          '<details style="font-size:12px;color:var(--color-text-muted,#8a8a99);">' +
          '<summary style="cursor:pointer;">자세히 (개발용)</summary>' +
          '<pre style="white-space:pre-wrap;word-break:break-all;line-height:1.6;max-height:320px;overflow:auto;margin:8px 0 0;">' +
          escapeAttr(JSON.stringify(data, null, 2)) + '</pre></details>'
        );
        return;
      }

      renderCharacters((data.result && data.result.characters) || []);
    } catch (err) {
      console.error('[character-extract] error', err);
      showDebug('<p style="color:#ff2d55;">네트워크 오류가 발생했습니다. 콘솔을 확인하세요.</p>');
    } finally {
      extractBtn.disabled = false;
      // 로딩 중 상태에서 끝났으면 empty 복원 (renderCharacters가 호출 안 됐을 때)
      if (charEmpty.style.display === '' && charEmpty.querySelector('.char-spinner')) {
        resetCharEmpty();
      }
    }
  }

  function escapeAttr(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // 모델 서버 role → 기존 배지(주연/조연/단역) 매핑
  function mapRole(role) {
    const r = String(role || '').trim();
    if (['주인공', '주연'].includes(r)) return { label: '주연', cls: 'role-lead' };
    if (['조연', '연인', '조력자', '동료', '파트너'].includes(r)) return { label: '조연', cls: 'role-support' };
    return { label: '단역', cls: 'role-minor' };
  }

  const ACTIONS_HTML =
    '<button class="icon-btn edit-btn" aria-label="수정"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>' +
    '<button class="icon-btn delete-btn" aria-label="삭제"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';

  // ===== 모델 응답 → 기존 표 UI 렌더링 =====
  function renderCharacters(characters) {
    const box = document.getElementById('charDebugBox');
    if (box) box.remove();

    const cell = (v) => {
      const t = String(v == null ? '' : v).trim();
      if (t === '') return '<td style="text-align:center;color:var(--color-text-muted,#8a8a99);">-</td>';
      return '<td>' + escapeAttr(t) + '</td>';
    };

    tableBody.innerHTML = characters.map(function (c) {
      const role = mapRole(c.role);
      return '<tr data-profile-label="' + escapeAttr(c.profile_label || '') + '">' +
        cell(c.char_name) +
        '<td><span class="role-badge ' + role.cls + '">' + role.label + '</span></td>' +
        cell(c.age) +
        cell(c.gender) +
        cell(c.appearance) +
        cell(c.detail_setting) +
        cell(c.relationships) +
        '<td class="char-actions">' + ACTIONS_HTML + '</td>' +
      '</tr>';
    }).join('');

    charEmpty.style.display = 'none';
    charTableWrap.style.display = 'block';
    updateSummary();
  }

  // ===== 요약/카운트 =====
  function updateSummary() {
    // 저장 전 새 행(data-is-new)은 제외 → 저장해야 숫자에 반영
    const rows = tableBody.querySelectorAll('tr:not([data-is-new])');
    let lead = 0, support = 0, minor = 0;
    rows.forEach(function (row) {
      const badge = row.querySelector('.role-badge');
      if (!badge) return;
      const role = badge.textContent.trim();
      if (role === '주연') lead++;
      else if (role === '조연') support++;
      else if (role === '단역') minor++;
    });
    const total = rows.length;
    document.getElementById('statTotal').innerHTML   = total   + '<small>명</small>';
    document.getElementById('statLead').innerHTML    = lead    + '<small>명</small>';
    document.getElementById('statSupport').innerHTML = support + '<small>명</small>';
    document.getElementById('statMinor').innerHTML   = minor   + '<small>명</small>';
    const countEl = charTableWrap.querySelector('.char-table-count');
    if (countEl) countEl.textContent = '총 ' + total + '명 / 최대 ' + MAX_CHARACTERS + '명';
  }

  // ===== 현재 표 → 서버 저장 (추가/수정/삭제 반영) =====
  function collectCharacters() {
    const out = [];
    tableBody.querySelectorAll('tr').forEach(function (row) {
      if (row.classList.contains('editing')) return;  // 편집 중 행 제외
      const cells = row.querySelectorAll('td');
      const txt = function (i) {
        const t = (cells[i] ? cells[i].textContent : '').trim();
        return t === '-' ? '' : t;
      };
      const name = txt(0);
      if (!name) return;  // 이름 없는 행 제외
      const badge = cells[1] ? cells[1].querySelector('.role-badge') : null;
      out.push({
        char_name: name,
        role: badge ? badge.textContent.trim() : '',
        age: txt(2),
        gender: txt(3),
        appearance: txt(4),
        detail_setting: txt(5),
        relationships: txt(6),
        profile_label: row.dataset.profileLabel || '',   // ← 추가
      });
    });
    return out;
  }

  function persistCharacters() {
    if (!selectedWorkId || !window.CHAR_CONFIG || !window.CHAR_CONFIG.saveUrl) return;
    const url = window.CHAR_CONFIG.saveUrl.replace('/0/', '/' + selectedWorkId + '/');
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.CHAR_CONFIG.csrfToken },
      body: JSON.stringify({ workId: selectedWorkId, characters: collectCharacters() }),
    }).catch(function (e) { console.error('[character save]', e); });
  }

  // ===== 표 클릭 (이벤트 위임) =====
  tableBody.addEventListener('click', function (e) {
    const row = e.target.closest('tr');
    if (!row) return;
    if (e.target.closest('.edit-btn'))   enterEdit(row);
    if (e.target.closest('.save-btn'))   saveEdit(row);
    if (e.target.closest('.cancel-btn')) cancelEdit(row);
    if (e.target.closest('.delete-btn')) openDeleteModal(row);
  });

  // ===== 역할 커스텀 드롭다운 =====
  const ROLE_OPTS = ['주연', '조연', '단역'];
  function buildRoleSelect(current) {
    const wrap = document.createElement('div');
    wrap.className = 'role-select';
    wrap.dataset.value = current;
    wrap.innerHTML =
      '<button type="button" class="role-select-trigger">' +
        '<span class="role-select-label">' + current + '</span>' +
        '<svg class="role-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</button>' +
      '<div class="role-select-panel">' +
        ROLE_OPTS.map(function (r) {
          return '<button type="button" class="role-select-opt' + (r === current ? ' selected' : '') + '" data-value="' + r + '">' + r + '</button>';
        }).join('') +
      '</div>';
    const trigger = wrap.querySelector('.role-select-trigger');
    const panel = wrap.querySelector('.role-select-panel');
    panel._roleWrap = wrap;
    function openRolePanel() {
      // 패널을 body로 빼서(포털) 표 스크롤 영역에 안 갇히게 → 잘림/스크롤바 없음, 트리거에 딱 붙음
      const r = trigger.getBoundingClientRect();
      document.body.appendChild(panel);
      panel.style.position = 'fixed';
      panel.style.top = (r.bottom - 1) + 'px';
      panel.style.left = r.left + 'px';
      panel.style.width = r.width + 'px';
      panel.style.minWidth = '0';
      panel.style.zIndex = '1000';
      panel.style.display = 'block';
    }
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      const wasOpen = wrap.classList.contains('open');
      closeAllRoleSelects();
      if (!wasOpen) { wrap.classList.add('open'); openRolePanel(); }
    });
    panel.addEventListener('click', function (e) {
      const opt = e.target.closest('.role-select-opt');
      if (!opt) return;
      e.stopPropagation();
      const val = opt.dataset.value;
      wrap.dataset.value = val;
      wrap.querySelector('.role-select-label').textContent = val;
      panel.querySelectorAll('.role-select-opt').forEach(function (o) { o.classList.toggle('selected', o === opt); });
      closeAllRoleSelects();
    });
    return wrap;
  }
  // 바깥 클릭/스크롤 시 닫기 + 포털된 패널 원위치 복귀
  function closeAllRoleSelects() {
    document.querySelectorAll('.role-select.open').forEach(function (o) { o.classList.remove('open'); });
    document.querySelectorAll('body > .role-select-panel').forEach(function (p) {
      p.removeAttribute('style');
      if (p._roleWrap) p._roleWrap.appendChild(p);
    });
  }
  document.addEventListener('click', closeAllRoleSelects);
  window.addEventListener('scroll', closeAllRoleSelects, true);

  // ===== 편집 진입 =====
  function enterEdit(row) {
    if (row.classList.contains('editing')) return;
    row.classList.add('editing');
    const cells = row.querySelectorAll('td');
    Object.keys(FIELDS).forEach(function (idx) {
      const cell = cells[idx];
      const cfg = FIELDS[idx];
      let val = cell.textContent.trim();
      if (val === '-') val = '';
      cell.dataset.original = cell.textContent;
      const input = document.createElement(cfg.area ? 'textarea' : 'input');
      input.className = cfg.area ? 'cell-input cell-textarea' : 'cell-input';
      input.value = val;
      input.dataset.max = cfg.max;
      input.dataset.label = cfg.label;
      if (cfg.area) {
        input.rows = 3;
      }
      input.addEventListener('input', function () {
        const max = parseInt(this.dataset.max, 10);
        if (this.value.length > max) {
          this.value = this.value.slice(0, max);
          showToast(this.dataset.label + '은(는) 최대 ' + max + '자까지 입력 가능합니다.');
        }
      });
      cell.textContent = '';
      cell.appendChild(input);
    });

    // 역할 셀 → 커스텀 드롭다운 (주연/조연/단역)
    const roleCell = cells[1];
    roleCell.dataset.original = roleCell.innerHTML;
    const currentRole = roleCell.textContent.trim() || '단역';
    roleCell.innerHTML = '';
    roleCell.appendChild(buildRoleSelect(currentRole));

    const actionCell = cells[7];
    actionCell.dataset.original = actionCell.innerHTML;
    actionCell.innerHTML =
      '<button class="mini-btn cancel-btn">취소</button>' +
      '<button class="mini-btn save-btn">저장</button>';
  }

  // ===== 저장 =====
  function saveEdit(row) {
    const cells = row.querySelectorAll('td');
    const nameInput = cells[0].querySelector('.cell-input');
    if (nameInput && nameInput.value.trim() === '') {
      showToast('이름은 필수 입력 항목입니다.');
      return;
    }
    Object.keys(FIELDS).forEach(function (idx) {
      const cell = cells[idx];
      const val = cell.querySelector('.cell-input').value.trim();
      if (val === '') {
        cell.textContent = '-';
        cell.style.textAlign = 'center';
        cell.style.color = 'var(--color-text-muted, #8a8a99)';
      } else {
        cell.textContent = val;
        cell.style.textAlign = '';
        cell.style.color = '';
      }
      delete cell.dataset.original;
    });
    delete row.dataset.isNew;  // 저장 완료 → 정식 캐릭터
    // 역할 저장 → 색상 뱃지로 복원
    const roleCell = cells[1];
    const roleSel = roleCell.querySelector('.role-select');
    const roleVal = (roleSel && roleSel.dataset.value) || '단역';
    const roleClass = roleVal === '주연' ? 'role-lead'
                    : roleVal === '조연' ? 'role-support' : 'role-minor';
    roleCell.innerHTML = '<span class="role-badge ' + roleClass + '">' + roleVal + '</span>';
    delete roleCell.dataset.original;

    const actionCell = cells[7];
    
    actionCell.innerHTML = actionCell.dataset.original;
    delete actionCell.dataset.original;
    row.classList.remove('editing');
    updateSummary();
    persistCharacters();  // 서버(RDS)에 반영
    showToast('수정 내용이 저장되었습니다.');
  }

  // ===== 취소 =====
  function cancelEdit(row) {
    // 저장된 적 없는 새 행이면 그냥 제거 (빈 캐릭터 추가 방지)
    if (row.dataset.isNew) {
      row.remove();
      updateSummary();
      if (tableBody.querySelectorAll('tr').length === 0) {
        charTableWrap.style.display = 'none';
        resetCharEmpty();
        charEmpty.style.display = '';
      }
      return;
    }
    const cells = row.querySelectorAll('td');
    Object.keys(FIELDS).forEach(function (idx) {
      const cell = cells[idx];
      cell.textContent = cell.dataset.original;
      delete cell.dataset.original;
    });

    // 역할 복원
    const roleCell = cells[1];
    roleCell.innerHTML = roleCell.dataset.original;
    delete roleCell.dataset.original;

    const actionCell = cells[7];

    actionCell.innerHTML = actionCell.dataset.original;
    delete actionCell.dataset.original;
    row.classList.remove('editing');
  }

  // ===== 삭제 모달 =====
  function openDeleteModal(row) {
    rowToDelete = row;
    deleteModal.classList.add('open');
    deleteBackdrop.classList.add('open');
  }
  function closeDeleteModal() {
    deleteModal.classList.remove('open');
    deleteBackdrop.classList.remove('open');
    rowToDelete = null;
  }
  deleteCancel.addEventListener('click', closeDeleteModal);
  deleteBackdrop.addEventListener('click', closeDeleteModal);
  deleteConfirm.addEventListener('click', function () {
    if (rowToDelete) {
      rowToDelete.remove();
      updateSummary();
      persistCharacters();  // 서버(RDS)에 반영
      showToast('선택하신 캐릭터가 삭제되었습니다.');
    }
    closeDeleteModal();
  });

  // ===== 캐릭터 추가 =====
  addBtn.addEventListener('click', function () {
    if (!selectedWorkId) {
      showToast('작품을 먼저 선택해 주세요.');
      return;
    }
    if (tableBody.querySelectorAll('tr').length >= MAX_CHARACTERS) {
      showToast('캐릭터는 최대 ' + MAX_CHARACTERS + '명까지 등록 가능합니다.');
      return;
    }
    charEmpty.style.display = 'none';
    charTableWrap.style.display = 'block';
    const tr = document.createElement('tr');
    tr.dataset.isNew = '1';  // 저장 전 새 행 (취소/이름없음 시 제거)
    tr.innerHTML =
      '<td>-</td>' +
      '<td><span class="role-badge role-minor">단역</span></td>' +
      '<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>' +
      '<td class="char-actions">' + ACTION_HTML + '</td>';
    tableBody.appendChild(tr);
    updateSummary();
    enterEdit(tr);
  });

});
