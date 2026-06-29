document.addEventListener('DOMContentLoaded', () => {

  // 이미 등록된 회차 번호 (중복 방지)
  let existingNumbers = [];
  try {
    const el = document.getElementById('existingNumbers');
    if (el) existingNumbers = (JSON.parse(el.textContent) || []).map(Number);
  } catch (e) { /* ignore */ }

  /* ===== 토스트 팝업 ===== */
  let toastEl = null;
  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ep-toast';
      document.body.appendChild(toastEl);
    }
    clearTimeout(toastTimer);
    toastEl.textContent = '※ ' + msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => { toastEl.classList.remove('show'); }, 2800);
  }


  /* ===== 탭 전환 ===== */
  document.querySelectorAll('.ep-reg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ep-reg-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ep-reg-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = document.getElementById('tab-' + tab.dataset.tab);
      if (pane) pane.classList.add('active');
    });
  });

  /* ===== 직접 입력 탭 카운터 ===== */
  const directTitle   = document.getElementById('directTitle');
  const directContent = document.getElementById('directContent');
  // 한글 IME 조합 입력은 maxlength를 잠깐 넘길 수 있어(31자) JS로 다시 잘라준다.
  directTitle?.addEventListener('input', () => {
    if (directTitle.value.length > 30) directTitle.value = directTitle.value.slice(0, 30);
    document.getElementById('directTitleCounter').textContent = directTitle.value.length + '/30';
  });
  directContent?.addEventListener('input', () => {
    if (directContent.value.length > 8000) directContent.value = directContent.value.slice(0, 8000);
    document.getElementById('directContentCounter').textContent =
      directContent.value.length.toLocaleString('ko-KR') + '/8,000';
  });

  /* ===== 공통 ===== */
  const submitBtn   = document.getElementById('epRegSubmitBtn');
  const workPk      = submitBtn?.dataset.workPk;
  const BASE_EP_NUM = parseInt(submitBtn?.dataset.episodeCount ?? '0');

  const directNumberInput = document.getElementById('directNumber');
  if (directNumberInput) directNumberInput.value = BASE_EP_NUM + 1;

  /* ===== 파일 업로드 탭 ===== */
  const MAX_FILES   = 5;
  const dropzone    = document.getElementById('dropzone');
  const fileInput   = document.getElementById('fileInput');
  const fileListEl  = document.getElementById('fileList');
  const queueListEl = document.getElementById('queueList');
  const addBtn      = document.getElementById('addToQueueBtn');
  const epNumberEl  = document.getElementById('epNumber');
  const epTitleEl   = document.getElementById('epTitle');

  let attachedFiles = [];
  let selectedIdx   = -1;
  let queueItems    = [];

  /* 회차 번호 입력 제한 (양의 정수만) */
  function restrictToPositiveInt(el) {
    if (!el) return;
    const BLOCKED = ['-', '+', '.', 'e', 'E'];
    el.addEventListener('keydown', e => { if (BLOCKED.includes(e.key)) e.preventDefault(); });
    el.addEventListener('input', () => {
      const v = parseInt(el.value);
      el.value = (!isNaN(v) && v >= 1) ? v : '';
    });
  }
  restrictToPositiveInt(epNumberEl);
  restrictToPositiveInt(document.getElementById('directNumber'));

  /* 드래그 앤 드롭 */
  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone?.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFiles(Array.from(e.dataTransfer.files));
  });
  fileInput?.addEventListener('change', () => {
    handleFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  function handleFiles(files) {
    for (const f of files) {
      if (attachedFiles.length + queueItems.length >= MAX_FILES) {
        showToast('파일은 최대 5개까지 첨부 가능합니다.');
        break;
      }
      if (!f.name.match(/\.(txt|docx)$/i)) { showToast('지원하지 않는 파일 형식입니다.'); continue; }
      if (f.size > 1024 * 1024) { alert(f.name + ': 1MB를 초과합니다.'); continue; }
      if (attachedFiles.find(x => x.name === f.name)) continue;
      attachedFiles.push(f);
    }
    renderFileList();
  }

  function fmtSize(b) {
    return b < 1024 ? b + 'B' : b < 1048576 ? (b/1024).toFixed(1) + 'KB' : (b/1048576).toFixed(1) + 'MB';
  }

  function selectFile(idx) {
    selectedIdx = idx;
    if (epTitleEl) { epTitleEl.value = ''; epTitleEl.focus(); }
    renderFileList();
  }

  function renderFileList() {
    if (!fileListEl) return;
    if (attachedFiles.length === 0) {
      dropzone && (dropzone.style.display = 'flex');
      dropzone && dropzone.classList.remove('compact');
      fileListEl.style.display = 'none';
      fileListEl.innerHTML = '';
      selectedIdx = -1;
      return;
    }
    dropzone && (dropzone.style.display = 'none');
    dropzone && dropzone.classList.remove('compact');
    fileListEl.style.display = 'block';
    fileListEl.innerHTML = '<div class="ep-reg-file-table-box"><table class="ep-reg-file-table">'
      + '<thead><tr><th>구분</th><th>파일명</th><th>크기</th><th></th></tr></thead><tbody>'
      + attachedFiles.map((f, i) => {
          const sel = i === selectedIdx ? ' class="ep-ftr-selected"' : '';
          return '<tr' + sel + ' data-idx="' + i + '" style="cursor:pointer">'
            + '<td class="ep-ft-num">' + (i + 1) + '</td>'
            + '<td class="ep-ft-name">' + esc(f.name) + '</td>'
            + '<td class="ep-ft-size">' + fmtSize(f.size) + '</td>'
            + '<td class="ep-ft-del"><button class="ep-reg-file-remove" data-idx="' + i + '">x</button></td>'
            + '</tr>';
        }).join('')
      + '</tbody></table></div>';

    fileListEl.querySelectorAll('tbody tr').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.ep-reg-file-remove')) return;
        selectFile(Number(row.dataset.idx));
      });
    });
    fileListEl.querySelectorAll('.ep-reg-file-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        attachedFiles.splice(idx, 1);
        if (selectedIdx === idx) selectedIdx = -1;
        else if (selectedIdx > idx) selectedIdx--;
        renderFileList();
      });
    });

    // 테이블 박스를 드롭 영역으로 활성화
    const tableBox = fileListEl.querySelector('.ep-reg-file-table-box');
    if (tableBox) {
      tableBox.addEventListener('dragover', e => { e.preventDefault(); tableBox.classList.add('dragover'); });
      tableBox.addEventListener('dragleave', () => tableBox.classList.remove('dragover'));
      tableBox.addEventListener('drop', e => {
        e.preventDefault();
        tableBox.classList.remove('dragover');
        handleFiles(Array.from(e.dataTransfer.files));
      });
    }

    if (selectedIdx === -1 && attachedFiles.length > 0) selectFile(0);
  }

  function isKorean(text) {
    const total = text.replace(/\s/g, '').length;
    if (total === 0) return false;
    const korean = (text.match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g) || []).length;
    return (korean / total) >= 0.7;
  }

  async function parseFile(file) {
    if (file.name.match(/\.txt$/i)) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = e => resolve(e.target.result.trim());
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsText(file, 'UTF-8');
      });
    }
    if (file.name.match(/\.docx$/i)) {
      if (typeof mammoth === 'undefined') throw new Error('docx 파싱 라이브러리 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      const buf    = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return result.value.trim();
    }
    throw new Error('지원하지 않는 파일 형식');
  }

  /* 화살표 버튼 → 대기열 추가 */
  addBtn?.addEventListener('click', async () => {
    if (selectedIdx < 0 || selectedIdx >= attachedFiles.length) {
      alert('왼쪽 목록에서 파일을 선택해주세요.');
      return;
    }
    const title = epTitleEl?.value.trim() ?? '';
    if (!title) { showToast('회차 제목을 입력해주세요.'); epTitleEl?.focus(); return; }

    const epNum = parseInt(epNumberEl?.value ?? '');
    if (!epNum || epNum < 1) { showToast('회차 번호를 입력해주세요.'); epNumberEl?.focus(); return; }

    // 중복 회차 번호 차단 (이미 등록된 회차 / 대기열에 있는 회차)
    if (existingNumbers.includes(epNum)) {
      showToast(epNum + '화는 이미 등록된 회차입니다.');
      epNumberEl?.focus();
      return;
    }
    if (queueItems.some((it) => it.epNum === epNum)) {
      showToast(epNum + '화는 이미 등록 대기 중입니다.');
      epNumberEl?.focus();
      return;
    }

    const file = attachedFiles[selectedIdx];
    addBtn.disabled = true;

    try {
      const content = await parseFile(file);
      if (!content) { alert('파일에서 텍스트를 추출할 수 없습니다.'); return; }
      if (content.length > 8000) {
        showToast('원문은 공백 포함 8,000자를 초과할 수 없습니다.');
        return;
      }
      if (!isKorean(content)) {
        showToast('회차 입력은 한국어 소설을 기준으로 합니다.');
        return;
      }

      queueItems.push({ file, title, epNum, content });
      attachedFiles.splice(selectedIdx, 1);
      selectedIdx = -1;
      if (epTitleEl)  epTitleEl.value  = '';
      if (epNumberEl) epNumberEl.value = '';

      renderFileList();
      renderQueue();
    } catch (err) {
      alert(err.message || '파일 파싱 오류');
    } finally {
      addBtn.disabled = false;
    }
  });

  function renderQueue() {
    if (!queueListEl) return;
    if (queueItems.length === 0) {
      queueListEl.innerHTML = '<p class="ep-reg-queue-empty">아직 추가된 회차가 없어요.</p>';
      return;
    }
    queueListEl.innerHTML = queueItems.map((item, i) =>
      '<div class="ep-reg-queue-item">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
      + '<span class="ep-queue-num">' + item.epNum + '화</span>'
      + '<span class="ep-reg-queue-name">' + esc(item.title) + '</span>'
      + '<svg class="ep-queue-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5cb85c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>'
      + '<button class="ep-reg-queue-remove" data-idx="' + i + '">x</button>'
      + '</div>'
    ).join('');

    queueListEl.querySelectorAll('.ep-reg-queue-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const removed = queueItems.splice(idx, 1)[0];
        attachedFiles.push(removed.file);
        renderFileList();
        renderQueue();
      });
    });
  }

  /* ===== 최종 등록 ===== */
  submitBtn?.addEventListener('click', async () => {
    const activePane  = document.querySelector('.ep-reg-pane.active');
    const isUploadTab = activePane?.id === 'tab-upload';

    if (isUploadTab) {
      if (queueItems.length === 0) { (window.AppUI?.toast ?? alert)('대기열에 회차를 추가해주세요.'); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = '등록 중...';
      const csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] ?? '';
      let successCount = 0;
      for (const item of queueItems) {
        try {
          const fd = new FormData();
          fd.append('title', item.title);
          fd.append('content', item.content);
          fd.append('episode_number', item.epNum);
          fd.append('csrfmiddlewaretoken', csrf);
          const res  = await fetch('/works/' + workPk + '/episodes/new/', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.ok) successCount++;
        } catch (e) {
          console.error('등록 오류:', item.title, e);
        }
      }
      if (successCount > 0) {
        window.location.href = '/works/' + workPk + '/';
      } else {
        alert('등록에 실패했습니다.');
        submitBtn.disabled = false;
        submitBtn.textContent = '회차 등록';
      }

    } else {
      const title   = directTitle?.value.trim() ?? '';
      const content = directContent?.value.trim() ?? '';
      if (!title)   { showToast('회차 제목을 입력해주세요.'); directTitle?.focus(); return; }
      if (!content) { showToast('원문을 입력해주세요.'); directContent?.focus(); return; }
      const directNumEl = document.getElementById('directNumber');
      const epNum = parseInt(directNumEl?.value ?? '');
      if (!epNum || epNum < 1) { showToast('회차 번호를 입력해주세요.'); directNumEl?.focus(); return; }
      // 제출 전 즉시 중복 회차 차단
      if (existingNumbers.includes(epNum)) {
        showToast(epNum + '화는 이미 등록된 회차입니다.');
        directNumEl?.focus();
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = '등록 중...';
      const csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] ?? '';
      const fd = new FormData();
      fd.append('title', title);
      fd.append('content', content);
      fd.append('episode_number', epNum);
      fd.append('csrfmiddlewaretoken', csrf);
      try {
        const res  = await fetch('/works/' + workPk + '/episodes/new/', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.ok) window.location.href = '/works/' + workPk + '/';
        else {
          // 서버가 돌려준 에러(중복 회차 등)를 토스트로 표시
          showToast(data.error || (data.errors && Object.values(data.errors)[0]) || '회차 등록에 실패했습니다.');
          submitBtn.disabled = false;
          submitBtn.textContent = '회차 등록';
        }
      } catch (e) {
        console.error(e);
        showToast('회차 등록 중 오류가 발생했습니다.');
        submitBtn.disabled = false;
        submitBtn.textContent = '회차 등록';
      }
    }
  });

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

});
