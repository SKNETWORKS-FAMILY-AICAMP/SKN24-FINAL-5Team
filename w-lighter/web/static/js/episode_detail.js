// episode_detail.js — 회차 상세(원문 ↔ 번역본 보기)

document.addEventListener('DOMContentLoaded', () => {

  const wrap        = document.getElementById('versionDropdown');
  const trigger     = document.getElementById('versionTrigger');
  const panel       = document.getElementById('versionPanel');
  const label       = document.getElementById('versionLabel');
  const versionList = document.getElementById('versionList');
  const transText   = document.querySelector('.ep-trans-text');
  if (!wrap) return;

  const langOpts  = panel.querySelectorAll('.ep-lang-opt');
  const caretPath = trigger.querySelector('svg path');
  const LANG_NAME = { en: '영어', cn: '중국어 (간체)', jp: '일본어', th: '태국어' };

  // 저장된 번역: { en:[{n,date,text}], cn:[...], jp:[...], th:[...] }
  const byLang = { en: [], cn: [], jp: [], th: [] };
  let activeLang = 'en';
  let selectedTransId = null;

  function updateCaret() {
    if (caretPath) {
      caretPath.setAttribute('d', wrap.classList.contains('open') ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z');
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 빈 줄 기준으로 문단(<p>) 분리
  function renderParas(text) {
    const parts = String(text || '').split(/\n{2,}/);
    return parts.map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('') || '<p></p>';
  }

  function renderVersionList(lang) {
    const list = byLang[lang] || [];
    if (!list.length) {
      versionList.innerHTML = '<p style="padding:12px 16px;color:var(--color-text-muted);font-size:13px;">번역 결과가 없습니다.</p>';
      return;
    }
    versionList.innerHTML = '';
    list.forEach((v, i) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'ep-version-item' + (lang === activeLang && v.selected ? ' active' : '');
      item.innerHTML =
        `<span class="ep-version-name">ver. ${v.n}</span>` +
        `<span class="ep-version-date">${esc(v.date)}</span>`;
      item.addEventListener('click', () => selectVersion(lang, i));
      versionList.appendChild(item);
    });
  }

  function selectVersion(lang, i) {
    const list = byLang[lang] || [];
    const v = list[i];
    if (!v) return;

    selectedTransId = v.id || null;
    activeLang = lang;
    langOpts.forEach(o => o.classList.toggle('active', o.dataset.lang === lang));
    list.forEach(x => { x.selected = false; });
    v.selected = true;

    if (transText) {
      transText.style.color = 'var(--color-text)';
      transText.innerHTML = renderParas(v.text);
    }
    label.textContent = `${LANG_NAME[lang] || ''} ver. ${v.n}${v.date ? '  ' + v.date : ''}`.trim();

    renderVersionList(lang);
    wrap.classList.remove('open');
    updateCaret();
  }

  // ----- 드롭다운 동작 -----
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !wrap.classList.contains('open');
    wrap.classList.toggle('open');
    updateCaret();
    if (opening) renderVersionList(activeLang);
  });

  panel.addEventListener('click', (e) => e.stopPropagation());

  langOpts.forEach(opt => {
    opt.addEventListener('mouseenter', () => renderVersionList(opt.dataset.lang));
    opt.addEventListener('click', () => {
      langOpts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      activeLang = opt.dataset.lang;
      renderVersionList(opt.dataset.lang);
    });
  });

  document.addEventListener('click', () => {
    wrap.classList.remove('open');
    updateCaret();
  });

  // 저장된 번역 버전이 없는 언어는 선택지에서 숨김
  function updateLangVisibility() {
    langOpts.forEach(o => {
      const has = (byLang[o.dataset.lang] || []).length > 0;
      o.style.display = has ? '' : 'none';
    });
  }

  // ----- 저장된 번역 불러오기 -----
  async function loadSaved() {
    if (!window.EP_CONFIG || !window.EP_CONFIG.listUrl) return;
    try {
      const res = await fetch(window.EP_CONFIG.listUrl);
      const data = await res.json();

      if (data.ok && Array.isArray(data.items)) {
        data.items.forEach(it => {
          const lang = (it.lang || 'EN').toLowerCase();
          if (!byLang[lang]) byLang[lang] = [];
          byLang[lang].push({ n: byLang[lang].length + 1, date: it.createdAt || '', text: it.translatedText || '', id: it.id });
        });
      }

      // 번역 버전이 없는 언어 옵션 숨김 처리
      updateLangVisibility();

      // 번역이 있는 첫 언어의 최신 버전을 자동 표시
      const first = ['en', 'cn', 'jp', 'th'].find(l => byLang[l] && byLang[l].length);
      if (first) selectVersion(first, byLang[first].length - 1);
    } catch (e) {
      console.error('[episode_detail load]', e);
    }
  }

  // ----- 토스트/확인 모달 (공통 AppUI) -----
  const showToast = (m) => (window.AppUI ? window.AppUI.toast(m) : alert(m));

  // ----- 번역 삭제 -----
  document.querySelector('.ep-delete-btn')?.addEventListener('click', async () => {
    if (!selectedTransId) {
      showToast('삭제할 번역본이 없습니다. 먼저 번역본을 선택하세요.');
      return;
    }
    if (!window.EP_CONFIG || !window.EP_CONFIG.deleteUrl) return;
    const ok = window.AppUI
      ? await window.AppUI.confirm({ title: '이 번역본을 삭제할까요?', desc: '선택한 <strong>번역본</strong>이 삭제되며 복구할 수 없습니다.' })
      : window.confirm('이 번역본을 삭제할까요?');
    if (!ok) return;
    try {
      const res = await fetch(window.EP_CONFIG.deleteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.EP_CONFIG.csrfToken },
        body: JSON.stringify({ translationId: selectedTransId }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('번역본이 삭제되었습니다.');
        setTimeout(() => location.reload(), 1200);
      } else {
        showToast(data.error || '삭제에 실패했습니다.');
      }
    } catch (e) {
      showToast('네트워크 오류로 삭제에 실패했습니다.');
    }
  });

  loadSaved();

});
