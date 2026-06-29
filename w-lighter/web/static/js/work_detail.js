// work_detail.js

document.addEventListener('DOMContentLoaded', () => {

  // ---------- 에피소드 정렬/언어 드롭다운 ----------
  function initEpDropdown(wrapperId, triggerId, panelId, labelId, onSelect) {
    const wrap    = document.getElementById(wrapperId);
    const trigger = document.getElementById(triggerId);
    const panel   = document.getElementById(panelId);
    const label   = document.getElementById(labelId);
    if (!wrap) return;

    const caretPath = trigger.querySelector('svg path');
    function updateCaret() {
      if (!caretPath) return;
      caretPath.setAttribute('d', wrap.classList.contains('open') ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z');
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.ep-sort-dropdown.open').forEach(d => {
        if (d !== wrap) {
          d.classList.remove('open');
          d.querySelector('.ep-sort-trigger svg path')?.setAttribute('d', 'M7 10l5 5 5-5z');
        }
      });
      wrap.classList.toggle('open');
      updateCaret();
    });

    panel.querySelectorAll('.ep-sort-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        panel.querySelectorAll('.ep-sort-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        label.textContent = opt.dataset.label || opt.textContent.trim();
        wrap.classList.remove('open');
        updateCaret();
        if (typeof onSelect === 'function') onSelect(opt.dataset.val);
      });
    });
  }

  // ---------- 회차 필터(언어) + 정렬(회차번호) ----------
  function applyEpView() {
    const list = document.querySelector('.episode-list');
    if (!list) return;
    const langVal  = document.querySelector('#langPanel .ep-sort-opt.active')?.dataset.val || 'ALL';
    const orderVal = document.querySelector('#orderPanel .ep-sort-opt.active')?.dataset.val || 'asc';

    const rows = Array.from(list.querySelectorAll('.episode-row'));
    // 회차번호 기준 정렬
    rows.sort((a, b) => {
      const na = parseInt(a.dataset.epnum || '0', 10);
      const nb = parseInt(b.dataset.epnum || '0', 10);
      return orderVal === 'desc' ? nb - na : na - nb;
    });
    rows.forEach(r => list.appendChild(r));
    // 언어 필터
    rows.forEach(r => {
      const langs = (r.dataset.langs || '').split(',').filter(Boolean);
      const show = langVal === 'ALL' ? true : langs.includes(langVal);
      r.style.display = show ? '' : 'none';
    });
  }

  // 번역본이 존재하는 언어만 드롭다운에 노출 (ALL은 항상 유지)
  function pruneLangOptions() {
    const available = new Set();
    document.querySelectorAll('.episode-row').forEach(r => {
      (r.dataset.langs || '').split(',').filter(Boolean).forEach(l => available.add(l.toUpperCase()));
    });
    document.querySelectorAll('#langPanel .ep-sort-opt').forEach(opt => {
      if (opt.dataset.val === 'ALL') return;          // ALL은 항상 유지
      opt.style.display = available.has(opt.dataset.val) ? '' : 'none';
    });
  }

  pruneLangOptions();
  initEpDropdown('langDropdown',  'langTrigger',  'langPanel',  'langLabel',  applyEpView);
  initEpDropdown('orderDropdown', 'orderTrigger', 'orderPanel', 'orderLabel', applyEpView);
  applyEpView();  // 초기: 회차번호 오름차순 + 전체

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ep-sort-dropdown')) {
      document.querySelectorAll('.ep-sort-dropdown.open').forEach(d => {
        d.classList.remove('open');
        d.querySelector('.ep-sort-trigger svg path')?.setAttribute('d', 'M7 10l5 5 5-5z');
      });
    }
  });

  // ---------- 회차 케밥 메뉴 ----------
  document.querySelectorAll('.ep-kebab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuId = btn.dataset.menu;
      const menu   = document.getElementById(menuId);
      document.querySelectorAll('.ep-menu-dropdown.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      menu?.classList.toggle('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ep-menu-wrap')) {
      document.querySelectorAll('.ep-menu-dropdown.open').forEach(m => m.classList.remove('open'));
    }
  });

  // ---------- 번역 보기 진입 차단 (번역 이력 없는 회차) ----------
  document.querySelectorAll('.translate-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row  = btn.closest('.episode-row');
      const langs = (row?.dataset.langs || '').split(',').filter(Boolean);
      if (!langs.length) {
        e.preventDefault();
        const showToast = (m) => (window.AppUI ? window.AppUI.toast(m) : alert(m));
        showToast('저장된 번역이 없습니다.');
      }
    });
  });

  // ---------- 작품 정보 수정 모달 ----------
  const detailEditBtn      = document.getElementById('detailEditBtn');
  const detailEditBackdrop = document.getElementById('detailEditBackdrop');
  const detailEditModal    = document.getElementById('detailEditModal');
  const detailEditClose    = document.getElementById('detailEditClose');

  function openDetailEditModal() {
    const btn      = document.getElementById('detailEditBtn');
    const title    = btn?.dataset.title    ?? '';
    const author   = btn?.dataset.author   ?? '';
    const genre    = btn?.dataset.genre    ?? '';
    const synopsis = btn?.dataset.synopsis ?? '';

    document.getElementById('detailEditTitle').value  = title;
    document.getElementById('detailEditTitleLen').textContent = title.length;
    document.getElementById('detailEditAuthor').value = author;
    document.getElementById('detailEditAuthorLen').textContent = author.length;
    document.getElementById('detailEditGenreValue').textContent = genre || '선택하기';
    document.getElementById('detailEditGenreHidden').value = genre;
    document.querySelectorAll('#detailEditGenreDropdown .custom-select-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.value === genre);
    });
    const syn = document.getElementById('detailEditSynopsis');
    syn.value = synopsis;
    document.getElementById('detailEditSynopsisLen').textContent = synopsis.length.toLocaleString();

    // 적색 오류 테두리 초기화
    ['detailEditTitle', 'detailEditAuthor', 'detailEditGenreTrigger'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.borderColor = '';
    });

    detailEditBackdrop.classList.add('open');
    detailEditModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailEditModal() {
    detailEditBackdrop.classList.remove('open');
    detailEditModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  detailEditBtn?.addEventListener('click', openDetailEditModal);
  detailEditClose?.addEventListener('click', closeDetailEditModal);
  detailEditBackdrop?.addEventListener('click', closeDetailEditModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailEditModal();
  });

  // 모달 내 카운터
  document.getElementById('detailEditTitle')?.addEventListener('input', function () {
    document.getElementById('detailEditTitleLen').textContent = this.value.length;
    if (this.value.trim()) this.style.borderColor = '';
  });
  const authorRegex = /^[가-힣a-zA-Z0-9]*$/;
  document.getElementById('detailEditAuthor')?.addEventListener('input', function () {
    document.getElementById('detailEditAuthorLen').textContent = this.value.length;
    const err = document.getElementById('detailEditAuthorError');
    const invalid = this.value && !authorRegex.test(this.value);
    err.style.display = invalid ? 'flex' : 'none';
    this.style.borderColor = invalid ? '#ff2d55' : '';
  });
  document.getElementById('detailEditSynopsis')?.addEventListener('input', function () {
    document.getElementById('detailEditSynopsisLen').textContent = this.value.length.toLocaleString();
  });

  // 장르 드롭다운
  const detailGenreSelect   = document.getElementById('detailEditGenreSelect');
  const detailGenreTrigger  = document.getElementById('detailEditGenreTrigger');
  const detailGenreDropdown = document.getElementById('detailEditGenreDropdown');
  const detailGenreValue    = document.getElementById('detailEditGenreValue');
  const detailGenreHidden   = document.getElementById('detailEditGenreHidden');

  detailGenreTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    detailGenreSelect.classList.toggle('open');
  });
  detailGenreDropdown?.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      detailGenreValue.textContent = opt.textContent;
      detailGenreHidden.value = opt.dataset.value;
      detailGenreDropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      detailGenreSelect.classList.remove('open');
      if (detailGenreTrigger) detailGenreTrigger.style.borderColor = '';
    });
  });
  document.addEventListener('click', (e) => {
    if (!detailGenreSelect?.contains(e.target)) detailGenreSelect?.classList.remove('open');
  });

  // ---------- 작품 수정 저장 ----------
  const detailEditSubmit = document.getElementById('detailEditSubmit');

  detailEditSubmit?.addEventListener('click', async () => {
    const title    = document.getElementById('detailEditTitle').value.trim();
    const author   = document.getElementById('detailEditAuthor').value.trim();
    const genre    = document.getElementById('detailEditGenreHidden').value;
    const synopsis = document.getElementById('detailEditSynopsis').value.trim();
    const workId   = document.getElementById('detailEditBtn').dataset.workId;

    // 필수값 누락 시 적색 테두리로 표시 (작품 등록과 동일)
    const dTitle = document.getElementById('detailEditTitle');
    const dAuthor = document.getElementById('detailEditAuthor');
    const dGenreTrigger = document.getElementById('detailEditGenreTrigger');
    [dTitle, dAuthor, dGenreTrigger].forEach(el => { if (el) el.style.borderColor = ''; });
    let valid = true;
    if (!title)  { dTitle.style.borderColor  = '#ff2d55'; valid = false; }
    if (!author) { dAuthor.style.borderColor = '#ff2d55'; valid = false; }
    if (!genre)  { if (dGenreTrigger) dGenreTrigger.style.borderColor = '#ff2d55'; valid = false; }
    if (!valid) return;

    detailEditSubmit.disabled = true;
    detailEditSubmit.textContent = '수정 중...';

    try {
      const fd = new FormData();
      fd.append('title',    title);
      fd.append('author',   author);
      fd.append('genre',    genre);
      fd.append('synopsis', synopsis);
      fd.append('csrfmiddlewaretoken', (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] ?? '');

      const res  = await fetch('/works/' + workId + '/update/', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.ok) {
        location.reload();
      }
    } catch (e) {
      console.error('작품 수정 오류:', e);
    } finally {
      detailEditSubmit.disabled = false;
      detailEditSubmit.textContent = '작품 수정';
    }
  });

});
