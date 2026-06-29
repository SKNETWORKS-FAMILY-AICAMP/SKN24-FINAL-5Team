// episode_edit.js

document.addEventListener('DOMContentLoaded', () => {

  const titleInput   = document.getElementById('directTitle');
  const titleCounter = document.getElementById('directTitleCounter');
  const contentInput = document.getElementById('directContent');
  const contentCounter = document.getElementById('directContentCounter');

  // 초기 카운터 동기화
  // 한글 IME 조합 입력은 maxlength를 잠깐 넘길 수 있어(31자) JS로 다시 잘라준다.
  function syncTitle() {
    if (titleInput.value.length > 30) titleInput.value = titleInput.value.slice(0, 30);
    titleCounter.textContent = `${titleInput.value.length}/30`;
    if (titleInput.value.trim()) titleInput.style.borderColor = '';
  }
  function syncContent() {
    if (contentInput.value.length > 8000) contentInput.value = contentInput.value.slice(0, 8000);
    contentCounter.textContent = `${contentInput.value.length.toLocaleString()}/8,000`;
    if (contentInput.value.trim()) contentInput.style.borderColor = '';
  }

  titleInput?.addEventListener('input', syncTitle);
  contentInput?.addEventListener('input', syncContent);

  // 페이지 로드 시 기존 값 반영
  syncTitle();
  syncContent();

  // ===== 수정 제출 =====
  const submitBtn = document.getElementById('epEditSubmitBtn');

  submitBtn?.addEventListener('click', async () => {
    const title   = titleInput?.value.trim() ?? '';
    const content = contentInput?.value.trim() ?? '';

    if (!title) {
      titleInput.style.borderColor = '#ff2d55';
      titleInput.focus();
      return;
    }
    if (!content) {
      contentInput.style.borderColor = '#ff2d55';
      contentInput.focus();
      return;
    }

    const workPk    = submitBtn.dataset.workPk;
    const episodePk = submitBtn.dataset.episodePk;
    submitBtn.disabled = true;
    submitBtn.textContent = '수정 중…';

    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('content', content);
      fd.append('csrfmiddlewaretoken', getCsrfToken());

      const res  = await fetch(`/works/${workPk}/episodes/${episodePk}/edit/`, { method: 'POST', body: fd });
      const data = await res.json();

      if (data.ok) {
        window.location.href = `/works/${workPk}/`;
      } else {
        if (data.errors?.title)   titleInput.style.borderColor   = '#ff2d55';
        if (data.errors?.content) contentInput.style.borderColor = '#ff2d55';
      }
    } catch (e) {
      console.error('회차 수정 오류:', e);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '회차 수정';
    }
  });

  function getCsrfToken() {
    let val = null;
    document.cookie.split(';').forEach(c => {
      const t = c.trim();
      if (t.startsWith('csrftoken=')) val = decodeURIComponent(t.slice('csrftoken='.length));
    });
    return val;
  }

});
