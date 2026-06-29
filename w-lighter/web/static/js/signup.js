(function () {
  const agreeAll = document.querySelector('[data-agree-all]');
  const requiredAgreements = Array.from(document.querySelectorAll('[data-agree-required]'));
  const nextTermsButton = document.querySelector('[data-next-terms]');
  const policyPanel = document.querySelector('[data-policy-panel]');
  const policyTitle = document.querySelector('[data-policy-title]');
  const policyDocuments = Array.from(document.querySelectorAll('[data-policy-document]'));
  const openPolicyButtons = document.querySelectorAll('[data-open-policy]');
  const closePolicyButton = document.querySelector('[data-close-policy]');
  const agreePolicyButton = document.querySelector('[data-agree-policy]');
  let activePolicy = null;
  let lastFocusedElement = null;

  function areRequiredAgreementsChecked() {
    return requiredAgreements.length > 0 && requiredAgreements.every((input) => input.checked);
  }

  function syncAgreementState() {
    if (agreeAll) {
      agreeAll.checked = areRequiredAgreementsChecked();
    }
    if (nextTermsButton) {
      nextTermsButton.disabled = !areRequiredAgreementsChecked();
    }
  }

  if (agreeAll) {
    agreeAll.addEventListener('change', () => {
      requiredAgreements.forEach((input) => {
        input.checked = agreeAll.checked;
      });
      syncAgreementState();
    });
  }

  requiredAgreements.forEach((input) => {
    input.addEventListener('change', syncAgreementState);
  });

  if (nextTermsButton) {
    nextTermsButton.addEventListener('click', () => {
      if (nextTermsButton.disabled) return;
      if (nextTermsButton.form) return;
      window.location.href = nextTermsButton.dataset.nextUrl;
    });
  }

  function openPolicy(type) {
    if (!policyPanel) return;
    activePolicy = type;
    lastFocusedElement = document.activeElement;
    policyPanel.hidden = false;
    policyTitle.textContent = type === 'privacy' ? '개인정보 수집 및 활용' : '서비스 이용약관';
    policyDocuments.forEach((documentElement) => {
      documentElement.hidden = documentElement.dataset.policyDocument !== type;
    });
    policyPanel.querySelector('.policy-scroll')?.scrollTo({ top: 0 });
    closePolicyButton?.focus();
  }

  function closePolicy() {
    if (!policyPanel) return;
    policyPanel.hidden = true;
    lastFocusedElement?.focus?.();
  }

  openPolicyButtons.forEach((button) => {
    button.addEventListener('click', () => openPolicy(button.dataset.openPolicy));
  });

  closePolicyButton?.addEventListener('click', closePolicy);

  agreePolicyButton?.addEventListener('click', () => {
    const target = requiredAgreements.find((input) => input.dataset.agreeRequired === activePolicy);
    if (target) {
      target.checked = true;
      syncAgreementState();
    }
    closePolicy();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && policyPanel && !policyPanel.hidden) {
      closePolicy();
    }
  });

  const nicknameField = document.querySelector('[data-nickname-field]');
  const nicknameInput = document.querySelector('[data-nickname-input]');
  const nicknameCount = document.querySelector('[data-nickname-count]');
  const startButton = document.querySelector('[data-start-signup]');
  const nicknamePattern = /^[가-힣a-zA-Z0-9]{2,10}$/;

  function validateNickname() {
    if (!nicknameInput || !startButton) return;
    const value = nicknameInput.value;
    const isEmpty = value.length === 0;
    const isValid = nicknamePattern.test(value);

    if (nicknameCount) {
      nicknameCount.textContent = String(value.length);
    }
    nicknameField?.classList.toggle('is-invalid', !isEmpty && !isValid);
    startButton.disabled = !isValid;
  }

  nicknameInput?.addEventListener('input', validateNickname);
  nicknameInput?.addEventListener('blur', validateNickname);

  startButton?.addEventListener('click', () => {
    if (startButton.disabled) return;
    if (startButton.form) return;
    if (startButton.dataset.startUrl) {
      window.location.href = startButton.dataset.startUrl;
    }
  });

  syncAgreementState();
  validateNickname();
})();
