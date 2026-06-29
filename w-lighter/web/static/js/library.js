// library.js

document.addEventListener('DOMContentLoaded', () => {
  const backdrop    = document.getElementById('modalBackdrop');
  const modal       = document.getElementById('newWorkModal');
  const openBtn     = document.getElementById('newWorkBtn');
  const closeBtn    = document.getElementById('modalClose');
  const synopsis    = document.getElementById('workSynopsis');
  const synopsisLen = document.getElementById('synopsisLen');

  function openModal() {
    backdrop.classList.add('open');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    backdrop.classList.remove('open');
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeEditModal(); }
  });

  // 신규 등록 - 장르 드롭다운
  const genreSelect   = document.getElementById('genreSelect');
  const genreTrigger  = document.getElementById('genreTrigger');
  const genreDropdown = document.getElementById('genreDropdown');
  const genreValue    = document.getElementById('genreValue');
  const genreInput    = document.getElementById('workGenre');

  genreTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    genreSelect.classList.toggle('open');
  });

  genreDropdown?.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      genreValue.textContent = opt.textContent;
      genreInput.value = opt.dataset.value;
      genreDropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      genreSelect.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!genreSelect?.contains(e.target)) genreSelect?.classList.remove('open');
  });

  // 카운터
  const titleInput = document.getElementById('workTitle');
  const titleLen   = document.getElementById('titleLen');
  titleInput?.addEventListener('input', () => {
    titleLen.textContent = titleInput.value.length;
  });

  const authorInput = document.getElementById('workAuthor');
  const authorLen   = document.getElementById('authorLen');
  const authorError = document.getElementById('authorError');
  const authorRegex = /^[가-힣a-zA-Z0-9]*$/;
  authorInput?.addEventListener('input', () => {
    authorLen.textContent = authorInput.value.length;
    if (authorInput.value && !authorRegex.test(authorInput.value)) {
      authorError.style.display = 'flex';
      authorInput.style.borderColor = '#ff2d55';
    } else {
      authorError.style.display = 'none';
      authorInput.style.borderColor = '';
    }
  });

  synopsis?.addEventListener('input', () => {
    synopsisLen.textContent = Number(synopsis.value.length).toLocaleString();
  });

  // ---------- 작품 등록 ----------
  const submitBtn = document.getElementById('submitWork');

  submitBtn?.addEventListener('click', async () => {
    const titleEl  = document.getElementById('workTitle');
    const authorEl = document.getElementById('workAuthor');
    const genreEl  = document.getElementById('workGenre');

    const title    = titleEl.value.trim();
    const author   = authorEl.value.trim();
    const genre    = genreEl.value;
    const synValue = synopsis?.value.trim() ?? '';

    let valid = true;
    [titleEl, authorEl].forEach(el => el.style.borderColor = '');

    if (!title)  { titleEl.style.borderColor  = '#ff2d55'; valid = false; }
    if (!author) { authorEl.style.borderColor = '#ff2d55'; valid = false; }
    if (!genre)  { document.getElementById('genreTrigger').style.borderColor = '#ff2d55'; valid = false; }
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    try {
      const fd = new FormData();
      fd.append('title',    title);
      fd.append('author',   author);
      fd.append('genre',    genre);
      fd.append('synopsis', synValue);
      fd.append('csrfmiddlewaretoken', getCookie('csrftoken'));

      const res  = await fetch('/works/create/', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.ok) {
        appendWorkCard(data.work);
        closeModal();
        resetWorkForm();
      } else {
        if (data.errors?.title)  titleEl.style.borderColor  = '#ff2d55';
        if (data.errors?.author) authorEl.style.borderColor = '#ff2d55';
      }
    } catch (e) {
      console.error('작품 등록 오류:', e);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '작품 등록';
    }
  });

  function getCookie(name) {
    let val = null;
    document.cookie.split(';').forEach(c => {
      const t = c.trim();
      if (t.startsWith(name + '=')) val = decodeURIComponent(t.slice(name.length + 1));
    });
    return val;
  }

  function appendWorkCard(work) {
    document.querySelector('.empty-state')?.remove();
    let grid = document.querySelector('.works-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'works-grid';
      document.querySelector('.library-panel').appendChild(grid);
    }
    const idx    = grid.querySelectorAll('.work-card').length + 1;
    const menuId = 'workMenu_new' + idx;
    const card   = document.createElement('div');
    card.className = 'work-card';
    card.dataset.workId = work.id;
    card.dataset.created = work.id;     // 등록일 순(신규 = 큰 id)
    card.dataset.title = work.title;
    card.dataset.author = work.pen_name ?? '';
    card.dataset.genre = work.genre ?? '';
    card.dataset.synopsis = work.synopsis ?? '';
    card.dataset.epdate = Math.floor(Date.now() / 1000);  // 회차 등록일순(방금 생성 → 최신)
    card.innerHTML = '<a href="/works/' + work.id + '/" class="work-cover work-cover-empty"></a>'
      + '<div class="work-info">'
      + '<div class="work-card-header">'
      + '<a href="/works/' + work.id + '/"><h3 class="work-title">' + esc(work.title) + '</h3></a>'
      + '<div class="work-menu-wrap">'
      + '<button class="work-kebab-btn" data-menu="' + menuId + '" aria-label="메뉴">'
      + '<svg width="4" height="16" viewBox="0 0 4 18" fill="currentColor"><circle cx="2" cy="2" r="2"/><circle cx="2" cy="9" r="2"/><circle cx="2" cy="16" r="2"/></svg>'
      + '</button>'
      + '<div class="work-menu-dropdown" id="' + menuId + '">'
      + '<button class="work-menu-item">작품 정보 수정</button>'
      + '<button class="work-menu-item work-menu-delete">작품 삭제</button>'
      + '</div></div></div>'
      + '<p class="work-meta">필명: ' + esc(work.pen_name) + '&nbsp;&nbsp;|&nbsp;&nbsp;장르: ' + esc(work.genre) + '</p>'
      + '<p class="work-episodes"><strong>총 0화</strong>&nbsp;&nbsp;|&nbsp;&nbsp;번역 0화</p>'
      + '</div>';
    grid.appendChild(card);

    card.querySelector('.work-kebab-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const mid  = e.currentTarget.dataset.menu;
      const menu = document.getElementById(mid);
      document.querySelectorAll('.work-menu-dropdown.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      menu?.classList.toggle('open');
    });

    const count = document.querySelectorAll('.work-card').length;
    document.querySelector('.library-count').textContent = '총 ' + count + '권';

    // 현재 정렬 기준으로 새 작품을 올바른 위치에 재배치
    if (window.__applyLibrarySort) window.__applyLibrarySort();
  }

  function resetWorkForm() {
    document.getElementById('workTitle').value   = '';
    document.getElementById('workAuthor').value  = document.getElementById('workAuthor').dataset.default ?? '';
    document.getElementById('workSynopsis').value = '';
    document.getElementById('workGenre').value   = '';
    document.getElementById('genreValue').textContent = '선택하기';
    document.getElementById('titleLen').textContent   = '0';
    document.getElementById('authorLen').textContent  = '0';
    document.getElementById('synopsisLen').textContent = '0';
    document.getElementById('authorError').style.display = 'none';
    document.getElementById('workAuthor').style.borderColor  = '';
    document.getElementById('workTitle').style.borderColor   = '';
    document.getElementById('genreTrigger').style.borderColor = '';
    document.querySelectorAll('#genreDropdown .custom-select-option.selected').forEach(o => o.classList.remove('selected'));
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- 작품 정보 수정 모달 ----------
  const editBackdrop = document.getElementById('editModalBackdrop');
  const editModal    = document.getElementById('editWorkModal');
  const editCloseBtn = document.getElementById('editModalClose');

  let currentEditWorkId = null;

  function openEditModal(card) {
    currentEditWorkId = card.dataset.workId ?? null;
    const title  = card.querySelector('.work-title')?.textContent.trim() ?? '';
    const author = card.dataset.author ?? '';
    const genre  = card.dataset.genre ?? '';

    document.getElementById('editWorkTitle').value  = title;
    document.getElementById('editTitleLen').textContent = title.length;
    document.getElementById('editWorkAuthor').value = author;
    document.getElementById('editAuthorLen').textContent = author.length;
    document.getElementById('editWorkGenre').value  = genre;
    document.getElementById('editGenreValue').textContent = genre || '선택하기';
    document.querySelectorAll('#editGenreDropdown .custom-select-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.value === genre);
    });

    const synopsis = card.dataset.synopsis ?? '';
    const editSyn = document.getElementById('editWorkSynopsis');
    if (editSyn) editSyn.value = synopsis;
    const editSynLen = document.getElementById('editSynopsisLen');
    if (editSynLen) editSynLen.textContent = Number(synopsis.length).toLocaleString();

    // 적색 오류 테두리 초기화
    [editTitleInput, editAuthorInput, editGenreTrigger].forEach(el => { if (el) el.style.borderColor = ''; });

    editBackdrop.classList.add('open');
    editModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeEditModal() {
    editBackdrop.classList.remove('open');
    editModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  editCloseBtn?.addEventListener('click', closeEditModal);
  editBackdrop?.addEventListener('click', closeEditModal);

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.work-menu-item:not(.work-menu-delete)');
    if (editBtn) {
      const card = editBtn.closest('.work-card');
      if (card) {
        openEditModal(card);
        editBtn.closest('.work-menu-dropdown')?.classList.remove('open');
      }
    }
  });

  // 수정 모달 카운터
  const editTitleInput  = document.getElementById('editWorkTitle');
  const editAuthorInput = document.getElementById('editWorkAuthor');
  const editSynopsis    = document.getElementById('editWorkSynopsis');
  const editSynopsisLen = document.getElementById('editSynopsisLen');
  const editAuthorError = document.getElementById('editAuthorError');
  const authorRegexEdit = /^[가-힣a-zA-Z0-9]*$/;

  editTitleInput?.addEventListener('input', () => {
    document.getElementById('editTitleLen').textContent = editTitleInput.value.length;
    if (editTitleInput.value.trim()) editTitleInput.style.borderColor = '';
  });
  editAuthorInput?.addEventListener('input', () => {
    document.getElementById('editAuthorLen').textContent = editAuthorInput.value.length;
    if (editAuthorInput.value && !authorRegexEdit.test(editAuthorInput.value)) {
      editAuthorError.style.display = 'flex';
      editAuthorInput.style.borderColor = '#ff2d55';
    } else {
      editAuthorError.style.display = 'none';
      editAuthorInput.style.borderColor = '';
    }
  });
  editSynopsis?.addEventListener('input', () => {
    editSynopsisLen.textContent = Number(editSynopsis.value.length).toLocaleString();
  });

  // 수정 모달 장르 드롭다운
  const editGenreSelect   = document.getElementById('editGenreSelect');
  const editGenreTrigger  = document.getElementById('editGenreTrigger');
  const editGenreDropdown = document.getElementById('editGenreDropdown');
  const editGenreValue    = document.getElementById('editGenreValue');
  const editGenreInput    = document.getElementById('editWorkGenre');

  editGenreTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    editGenreSelect.classList.toggle('open');
  });
  editGenreDropdown?.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      editGenreValue.textContent = opt.textContent;
      editGenreInput.value = opt.dataset.value;
      editGenreDropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      editGenreSelect.classList.remove('open');
      editGenreTrigger.style.borderColor = '';
    });
  });
  document.addEventListener('click', (e) => {
    if (!editGenreSelect?.contains(e.target)) editGenreSelect?.classList.remove('open');
  });

  // ---------- 작품 수정 저장 ----------
  const submitEditBtn = document.getElementById('submitEditWork');

  submitEditBtn?.addEventListener('click', async () => {
    if (!currentEditWorkId) return;

    const title    = document.getElementById('editWorkTitle').value.trim();
    const author   = document.getElementById('editWorkAuthor').value.trim();
    const genre    = document.getElementById('editWorkGenre').value;
    const synopsis = document.getElementById('editWorkSynopsis')?.value.trim() ?? '';

    // 필수값 누락 시 적색 테두리로 표시 (작품 등록과 동일)
    [editTitleInput, editAuthorInput, editGenreTrigger].forEach(el => { if (el) el.style.borderColor = ''; });
    let valid = true;
    if (!title)  { editTitleInput.style.borderColor  = '#ff2d55'; valid = false; }
    if (!author) { editAuthorInput.style.borderColor = '#ff2d55'; valid = false; }
    if (!genre)  { if (editGenreTrigger) editGenreTrigger.style.borderColor = '#ff2d55'; valid = false; }
    if (!valid) return;

    submitEditBtn.disabled = true;
    submitEditBtn.textContent = '수정 중...';

    try {
      const fd = new FormData();
      fd.append('title',    title);
      fd.append('author',   author);
      fd.append('genre',    genre);
      fd.append('synopsis', synopsis);
      fd.append('csrfmiddlewaretoken', getCookie('csrftoken'));

      const res  = await fetch('/works/' + currentEditWorkId + '/update/', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.ok) {
        location.reload();
      }
    } catch (e) {
      console.error('작품 수정 오류:', e);
    } finally {
      submitEditBtn.disabled = false;
      submitEditBtn.textContent = '작품 수정';
    }
  });

  // ---------- 정렬 드롭다운 ----------
  const sortDropdown = document.getElementById('sortDropdown');
  const sortTrigger  = document.getElementById('sortTrigger');
  const sortLabel    = document.getElementById('sortLabel');
  const sortOpts     = document.querySelectorAll('.sort-opt');

  const sortCaretPath = sortTrigger?.querySelector('svg path');
  function updateSortCaret() {
    if (!sortCaretPath) return;
    const isOpen = sortDropdown.classList.contains('open');
    sortCaretPath.setAttribute('d', isOpen ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z');
  }

  sortTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    sortDropdown.classList.toggle('open');
    updateSortCaret();
  });

  // 현재 정렬 기준으로 카드 재배치
  function applySort() {
    const grid = document.querySelector('.works-grid');
    if (!grid) return;
    const active = document.querySelector('.sort-opt.active');
    const sort = active ? active.dataset.sort : 'created';
    const cards = Array.from(grid.querySelectorAll('.work-card'));
    cards.sort((a, b) => {
      if (sort === 'title') {
        // 한글(가나다) → 영문(A-Z) → 숫자 → 특수문자 순
        const rank = (s) => {
          const c = (s || '').trim().charAt(0);
          if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(c)) return 0;  // 한글
          if (/[a-zA-Z]/.test(c)) return 1;            // 영문
          if (/[0-9]/.test(c)) return 2;               // 숫자
          return 3;                                    // 특수문자/기타
        };
        const ra = rank(a.dataset.title), rb = rank(b.dataset.title);
        if (ra !== rb) return ra - rb;
        return (a.dataset.title || '').localeCompare(b.dataset.title || '', 'ko');
      }
      if (sort === 'episode') {
        // 회차 등록일순: 가장 최근 회차 등록 시각이 최신인 작품부터
        return parseInt(b.dataset.epdate || '0', 10) - parseInt(a.dataset.epdate || '0', 10);
      }
      // created: 등록일 최신순 (work_id 내림차순)
      return parseInt(b.dataset.created || '0', 10) - parseInt(a.dataset.created || '0', 10);
    });
    cards.forEach((c) => grid.appendChild(c));
  }
  // 전역에서 호출 가능하게 (작품 등록 직후 재정렬)
  window.__applyLibrarySort = applySort;

  sortOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      sortOpts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      sortLabel.textContent = opt.textContent.trim();
      sortDropdown.classList.remove('open');
      updateSortCaret();
      applySort();
    });
  });

  document.addEventListener('click', (e) => {
    if (!sortDropdown?.contains(e.target)) {
      sortDropdown?.classList.remove('open');
      updateSortCaret();
    }
  });

  // ---------- 작품 카드 케밥 메뉴 ----------
  document.querySelectorAll('.work-kebab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuId = btn.dataset.menu;
      const menu   = document.getElementById(menuId);
      document.querySelectorAll('.work-menu-dropdown.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      menu?.classList.toggle('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.work-menu-wrap')) {
      document.querySelectorAll('.work-menu-dropdown.open').forEach(m => m.classList.remove('open'));
    }
  });
});
