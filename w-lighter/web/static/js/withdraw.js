(function () {
  const page = document.querySelector('[data-withdraw-page]');
  if (!page) return;

  const checks = Array.from(document.querySelectorAll('[data-withdraw-check]'));
  const openButton = document.querySelector('[data-withdraw-open]');
  const modal = document.querySelector('[data-withdraw-modal]');
  const closeButtons = document.querySelectorAll('[data-withdraw-close]');
  const submitButton = document.querySelector('[data-withdraw-submit]');
  const failToast = document.querySelector('[data-withdraw-toast]');
  const countdown = document.querySelector('[data-withdraw-countdown]');
  let lastFocusedElement = null;

  function areAllChecked() {
    return checks.length > 0 && checks.every((check) => check.checked);
  }

  function syncSubmitState() {
    if (openButton) {
      openButton.disabled = !areAllChecked();
    }
  }

  function openModal() {
    if (!modal || openButton?.disabled) return;
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    submitButton?.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    lastFocusedElement?.focus?.();
  }

  checks.forEach((check) => {
    check.addEventListener('change', syncSubmitState);
  });

  openButton?.addEventListener('click', openModal);

  closeButtons.forEach((button) => {
    button.addEventListener('click', closeModal);
  });

  submitButton?.addEventListener('click', async () => {
    const completeUrl = submitButton.dataset.completeUrl;
    submitButton.disabled = true;
    const csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '';
    try {
      const res = await fetch('/accounts/withdraw/', {
        method: 'POST',
        headers: { 'X-CSRFToken': csrf, 'X-Requested-With': 'XMLHttpRequest' },
      });
      const data = await res.json().catch(() => ({ ok: res.ok }));
      if (data.ok) {
        window.location.href = completeUrl || '/';
      } else {
        throw new Error(data.error || '실패');
      }
    } catch (e) {
      submitButton.disabled = false;
      closeModal();
      if (failToast) {
        failToast.hidden = false;
        window.requestAnimationFrame(() => failToast.classList.add('is-visible'));
        window.setTimeout(() => {
          failToast.classList.remove('is-visible');
          window.setTimeout(() => { failToast.hidden = true; }, 150);
        }, 2800);
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });

  if (failToast && new URLSearchParams(window.location.search).has('failed')) {
    failToast.hidden = false;
    window.requestAnimationFrame(() => {
      failToast.classList.add('is-visible');
    });
    window.setTimeout(() => {
      failToast.classList.remove('is-visible');
      window.setTimeout(() => {
        failToast.hidden = true;
      }, 150);
    }, 2800);
  }

  if (countdown) {
    const homeUrl = page.dataset.homeUrl || '/';
    let seconds = Number.parseInt(countdown.textContent, 10) || 3;

    const timer = window.setInterval(() => {
      seconds -= 1;
      countdown.textContent = String(Math.max(seconds, 0));

      if (seconds <= 0) {
        window.clearInterval(timer);
        window.location.href = homeUrl;
      }
    }, 1000);
  }

  syncSubmitState();
})();
