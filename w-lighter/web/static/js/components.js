// 공통 UI 컴포넌트 헬퍼 — window.AppUI.toast(msg), window.AppUI.confirm(opts)
// CSS: static/css/components.css (.app-toast / .app-modal)
(function () {
  // ---------- 토스트 ----------
  let toastTimer = null;
  function ensureToast() {
    let t = document.getElementById('appToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'appToast';
      t.className = 'app-toast';
      document.body.appendChild(t);
    }
    return t;
  }
  function toast(msg) {
    const t = ensureToast();
    t.textContent = '※ ' + msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ---------- 확인 모달 ----------
  function ensureModal() {
    if (document.getElementById('appModalBackdrop')) return;
    const bd = document.createElement('div');
    bd.id = 'appModalBackdrop';
    bd.className = 'app-modal-backdrop';
    const md = document.createElement('div');
    md.id = 'appModal';
    md.className = 'app-modal';
    md.setAttribute('role', 'dialog');
    md.setAttribute('aria-modal', 'true');
    md.innerHTML =
      '<h3 class="app-modal-title" id="appModalTitle"></h3>' +
      '<p class="app-modal-desc" id="appModalDesc"></p>' +
      '<div class="app-modal-actions">' +
      '<button class="app-modal-btn cancel" id="appModalCancel"></button>' +
      '<button class="app-modal-btn confirm" id="appModalOk"></button>' +
      '</div>';
    document.body.appendChild(bd);
    document.body.appendChild(md);
  }

  // confirm({ title, desc(HTML 허용), okText, cancelText }) → Promise<boolean>
  function confirm(opts) {
    opts = opts || {};
    ensureModal();
    const bd = document.getElementById('appModalBackdrop');
    const md = document.getElementById('appModal');
    document.getElementById('appModalTitle').textContent = opts.title || '삭제할까요?';
    document.getElementById('appModalDesc').innerHTML = opts.desc || '';
    document.getElementById('appModalOk').textContent = opts.okText || '삭제하기';
    document.getElementById('appModalCancel').textContent = opts.cancelText || '취소하기';

    return new Promise((resolve) => {
      bd.classList.add('open');
      md.classList.add('open');
      document.body.style.overflow = 'hidden';
      const close = (r) => {
        bd.classList.remove('open');
        md.classList.remove('open');
        document.body.style.overflow = '';
        document.getElementById('appModalOk').onclick = null;
        document.getElementById('appModalCancel').onclick = null;
        bd.onclick = null;
        resolve(r);
      };
      document.getElementById('appModalOk').onclick = () => close(true);
      document.getElementById('appModalCancel').onclick = () => close(false);
      bd.onclick = () => close(false);
    });
  }

  // ---------- 크레딧 부족 모달 (번역 페이지와 동일한 마크업/클래스 재사용) ----------
  function ensureCreditModal() {
    if (document.getElementById('appCreditBackdrop')) return;
    const bd = document.createElement('div');
    bd.id = 'appCreditBackdrop';
    bd.className = 'tr-credit-modal-backdrop';
    bd.innerHTML =
      '<div class="tr-credit-modal" id="appCreditModal" role="dialog" aria-modal="true">' +
        '<div class="tr-credit-icon tr-credit-icon-limit" aria-hidden="true"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5"/><path d="M12 17.5h.01"/></svg></div>' +
        '<h2 class="tr-credit-modal-title">크레딧이 부족합니다.</h2>' +
        '<p class="tr-credit-modal-desc">선택하신 기능을 실행하기 위한 크레딧이 부족합니다.</p>' +
        '<a class="tr-credit-btn tr-credit-btn-charge" id="appCreditCharge">충전 페이지로 이동</a>' +
      '</div>';
    document.body.appendChild(bd);
    bd.addEventListener('click', function (e) { if (e.target === bd) closeCreditModal(); });
  }
  function closeCreditModal() {
    const bd = document.getElementById('appCreditBackdrop');
    const md = document.getElementById('appCreditModal');
    if (bd) bd.classList.remove('open');
    if (md) md.classList.remove('active');
    document.body.style.overflow = '';
  }
  function creditModal() {
    ensureCreditModal();
    const charge = document.getElementById('appCreditCharge');
    const chip = document.querySelector('.credit-chip');
    charge.setAttribute('href', (chip && chip.getAttribute('href')) || '/credits/charge');
    document.getElementById('appCreditBackdrop').classList.add('open');
    document.getElementById('appCreditModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  window.AppUI = { toast: toast, confirm: confirm, creditModal: creditModal };
})();
