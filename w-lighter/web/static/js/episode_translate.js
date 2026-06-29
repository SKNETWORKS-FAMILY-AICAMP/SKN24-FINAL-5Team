document.addEventListener('DOMContentLoaded', () => {

  /* ===== 언어 탭 ===== */
  const langTabs = document.querySelectorAll('.tr-lang-tab');
  langTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      langTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  /* ===== 콘텐츠 탭 ===== */
  const tabs = document.querySelectorAll('.tr-tab');
  const panes = document.querySelectorAll('.tr-tab-pane');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const id = 'tab-' + tab.dataset.tab;
      const pane = document.getElementById(id);
      if (pane) pane.classList.add('active');
    });
  });

  /* ===== 번역 실행 전 크레딧 확인 ===== */
  const translateBtn = document.querySelector('.tr-translate-btn');
  const creditBalance = document.getElementById('creditBalance');
  const sourceText = document.querySelector('.tr-source-text');
  const creditBackdrop = document.getElementById('translationCreditBackdrop');
  const spendModal = document.getElementById('translationSpendModal');
  const limitModal = document.getElementById('translationLimitModal');
  const requiredCreditText = document.getElementById('translationRequiredCredit');
  const spendConfirmBtn = document.getElementById('translationSpendConfirm');
  const creditModalCloseBtns = document.querySelectorAll('[data-credit-modal-close]');
  let lastCreditCheck = null;

  function parseCreditValue(value) {
    const normalized = String(value ?? '').replace(/[^\d]/g, '');
    return Number.parseInt(normalized || '0', 10);
  }

  function getCurrentCredit() {
    return parseCreditValue(creditBalance?.dataset.creditBalance || creditBalance?.textContent);
  }

  function updateCreditBalance(balance) {
    if (!creditBalance) return;
    creditBalance.dataset.creditBalance = String(balance);
    creditBalance.textContent = `${formatNumber(balance)} C`;
  }

  async function spendCredit(feature, amount) {
    const url = creditBalance?.dataset.creditUseUrl;
    const csrf = creditBalance?.dataset.csrf;
    if (!url || !csrf) throw new Error('크레딧 차감 설정을 찾을 수 없습니다.');

    const form = new FormData();
    form.append('feature', feature);
    form.append('amount', String(amount));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrf,
        'X-Requested-With': 'XMLHttpRequest',
      },
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

  function getSourceCharacterCount() {
    if (!sourceText) return 0;
    const visibleText = sourceText.textContent.replace(/\s+/g, ' ').trim();
    return Array.from(visibleText).length;
  }

  function getRequiredCredit() {
    return Math.ceil(getSourceCharacterCount() / 5);
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }

  function closeCreditModal() {
    creditBackdrop?.classList.remove('open');
    spendModal?.classList.remove('active');
    limitModal?.classList.remove('active');
    creditBackdrop?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openCreditModal(type) {
    if (!creditBackdrop) return;
    creditBackdrop.classList.add('open');
    creditBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    spendModal?.classList.toggle('active', type === 'spend');
    limitModal?.classList.toggle('active', type === 'limit');

    const focusTarget = type === 'spend'
      ? spendModal?.querySelector('[data-credit-modal-close], button, a')
      : limitModal?.querySelector('a, button');
    focusTarget?.focus();
  }

  function checkTranslationCredit() {
    const requiredCredit = getRequiredCredit();
    const currentCredit = getCurrentCredit();
    lastCreditCheck = {
      requiredCredit,
      currentCredit,
      sourceCharacterCount: getSourceCharacterCount(),
    };

    if (requiredCreditText) requiredCreditText.textContent = formatNumber(requiredCredit);
    openCreditModal(currentCredit >= requiredCredit ? 'spend' : 'limit');
  }

  translateBtn?.addEventListener('click', checkTranslationCredit);

  creditModalCloseBtns.forEach(btn => {
    btn.addEventListener('click', closeCreditModal);
  });

  creditBackdrop?.addEventListener('click', (event) => {
    if (event.target === creditBackdrop) closeCreditModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && creditBackdrop?.classList.contains('open')) {
      closeCreditModal();
    }
  });

  spendConfirmBtn?.addEventListener('click', async () => {
    const detail = lastCreditCheck || {
      requiredCredit: getRequiredCredit(),
      currentCredit: getCurrentCredit(),
      sourceCharacterCount: getSourceCharacterCount(),
    };
    spendConfirmBtn.disabled = true;
    try {
      const result = await spendCredit('translation', detail.requiredCredit);
      closeCreditModal();
      document.dispatchEvent(new CustomEvent('translation:credit-confirmed', {
        detail: { ...detail, balance: result.balance },
      }));
    } catch (error) {
      if (requiredCreditText) requiredCreditText.textContent = formatNumber(detail.requiredCredit);
      openCreditModal(error.message === '크레딧이 부족합니다.' ? 'limit' : 'spend');
      if (error.message !== '크레딧이 부족합니다.') trToast(error.message);
    } finally {
      spendConfirmBtn.disabled = false;
    }
  });

  /* ===== 버전 드롭다운 공통 초기화 ===== */
  function initVersionDropdown(dropdownId, triggerId, panelId, labelId) {
    const wrap = document.getElementById(dropdownId);
    const trigger = document.getElementById(triggerId);
    const panel = document.getElementById(panelId);
    const label = document.getElementById(labelId);
    if (!wrap || !trigger || !panel) return;

    const caretPath = trigger.querySelector('svg path');
    function updateCaret() {
      if (!caretPath) return;
      caretPath.setAttribute('d', wrap.classList.contains('open') ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z');
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // 다른 드롭다운 닫기
      document.querySelectorAll('.tr-version-dropdown.open').forEach(d => {
        if (d !== wrap) {
          d.classList.remove('open');
          d.querySelector('.tr-version-trigger svg path')?.setAttribute('d', 'M7 10l5 5 5-5z');
        }
      });
      wrap.classList.toggle('open');
      updateCaret();
    });

    panel.addEventListener('click', (e) => e.stopPropagation());

    panel.querySelectorAll('.tr-version-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        panel.querySelectorAll('.tr-version-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const name = opt.querySelector('.tr-ver-name')?.textContent.trim() ?? '';
        if (label) label.textContent = name;
        wrap.classList.remove('open');
        updateCaret();
      });
    });
  }

  // 원문(source) 탭에는 버전 선택이 없음 — 버전은 번역본/리포트에만 존재
  initVersionDropdown('versionDropdown2', 'versionTrigger2', 'versionPanel2', 'versionLabel2');
  initVersionDropdown('versionDropdown3', 'versionTrigger3', 'versionPanel3', 'versionLabel3');

  document.addEventListener('click', () => {
    document.querySelectorAll('.tr-version-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.querySelector('.tr-version-trigger svg path')?.setAttribute('d', 'M7 10l5 5 5-5z');
    });
  });

  /* ===== 채팅 입력 ===== */
  const chatInput = document.getElementById('chatInput');
  const charCount = document.getElementById('charCount');
  const sendBtn = document.getElementById('sendBtn');
  const chatArea = document.getElementById('chatArea');

  if (chatInput && charCount) {
    chatInput.addEventListener('input', () => {
      const len = chatInput.value.length;
      charCount.textContent = `${len}/1,000`;
      chatInput.style.height = 'auto';
      chatInput.style.height = chatInput.scrollHeight + 'px';
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  function appendBotMessage(text) {
    const botMsg = document.createElement('div');
    botMsg.className = 'tr-chat-msg tr-chat-bot';
    botMsg.innerHTML =
      `<div class="tr-chat-bot-icon"></div>` +
      `<p class="tr-chat-bot-text">${escapeHtml(text)}</p>`;
    chatArea.appendChild(botMsg);
    chatArea.scrollTop = chatArea.scrollHeight;
    return botMsg;
  }

  function appendUserMessage(text) {
    if (!chatArea) return;
    const div = document.createElement('div');
    div.className = 'tr-chat-msg tr-chat-user';
    div.innerHTML = `<p class="tr-chat-user-text">${escapeHtml(text)}</p>`;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // 첫 환영 메시지만 남기고 대화 비우기
  function resetChat() {
    if (!chatArea) return;
    Array.from(chatArea.children).forEach((c, i) => { if (i > 0) c.remove(); });
  }

  // 선택된 번역 버전의 저장된 챗봇 대화 불러오기
  async function loadChatForVersion(translationId) {
    resetChat();
    currentPendingAction = null;
    if (!translationId || !window.TR_CONFIG?.chatUrl) return;
    try {
      const res = await fetch(window.TR_CONFIG.chatUrl + '?translation_id=' + encodeURIComponent(translationId));
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.messages)) return;
      data.messages.forEach((m) => {
        const isUser = /user|질문|me/i.test(m.sender || '');
        if (isUser) appendUserMessage(m.text);
        else appendBotMessage(m.text);
      });
    } catch (e) {
      console.error('[load chat]', e);
    }
  }

  function getChatHistory() {
    if (!chatArea) return [];
    const msgs = [];
    chatArea.querySelectorAll('.tr-chat-msg').forEach(el => {
      const isUser = el.classList.contains('tr-chat-user');
      const textEl = el.querySelector('.tr-chat-user-text, .tr-chat-bot-text');
      if (!textEl) return;
      const content = textEl.textContent.trim();
      if (!content || content === '답변을 작성 중입니다...') return;
      msgs.push({ role: isUser ? 'user' : 'assistant', content });
    });
    return msgs.slice(-8);
  }

  async function sendMessage() {
    if (!chatInput || !chatArea) return;
    const text = chatInput.value.trim();
    if (!text) return;

    const chatHistory = getChatHistory();
    const translationId = await ensureTranslationId();

    // 유저 메시지 추가
    const userMsg = document.createElement('div');
    userMsg.className = 'tr-chat-msg tr-chat-user';
    userMsg.innerHTML = `<p class="tr-chat-user-text">${escapeHtml(text)}</p>`;
    chatArea.appendChild(userMsg);

    chatInput.value = '';
    chatInput.style.height = 'auto';
    if (charCount) charCount.textContent = '0/1,000';
    chatArea.scrollTop = chatArea.scrollHeight;

    // 검수 챗봇 호출
    if (!window.TR_CONFIG?.inspectUrl) return;
    const pending = appendBotMessage('답변을 작성 중입니다...');
    try {
      const res = await fetch(window.TR_CONFIG.inspectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.TR_CONFIG.csrfToken,
        },
        body: JSON.stringify({
          message: text,
          targetCountry: getActiveLang(),
          translationId,
          pendingAction: currentPendingAction,
          chatHistory,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        pending.querySelector('.tr-chat-bot-text').textContent = data.error || '오류가 발생했습니다.';
      } else {
        const r = data.result || {};
        let answer = r.answer || extractText(r, ['answer', 'reply', 'message', 'text', 'content']) || '';
        if (typeof answer !== 'string') answer = JSON.stringify(answer);
        pending.querySelector('.tr-chat-bot-text').textContent = answer || '(응답 없음)';
        // pendingAction 상태 갱신 (TTL 3턴)
        if (r.pendingAction) {
          currentPendingAction = { ...r.pendingAction, _ttl: 3 };
        } else if (currentPendingAction) {
          if (r.actionExecuted) {
            currentPendingAction = null;
          } else {
            currentPendingAction._ttl = (currentPendingAction._ttl ?? 1) - 1;
            if (currentPendingAction._ttl <= 0) currentPendingAction = null;
          }
        }
        // 수정 제안(edits)이 있으면 "수정 제안" 카드 추가
        if (Array.isArray(r.edits) && r.edits.length) {
          appendSuggestionCard(r.changeSummary || '제안된 수정 번역입니다.', r.edits);
        }
      }
    } catch (e) {
      pending.querySelector('.tr-chat-bot-text').textContent = '네트워크 오류가 발생했습니다.';
    }
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  /* ===== 모델 서버 연동 헬퍼 ===== */
  function getActiveLang() {
    return document.querySelector('.tr-lang-tab.active')?.dataset.lang || 'EN';
  }

  // 응답 객체에서 후보 키들을 훑어 첫 문자열을 반환(응답 스키마 변동 대비)
  function extractText(obj, keys) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    for (const k of keys) {
      if (obj[k] != null) {
        if (typeof obj[k] === 'string') return obj[k];
        if (typeof obj[k] === 'object') {
          const nested = extractText(obj[k], keys);
          if (nested) return nested;
        }
      }
    }
    if (obj.result) return extractText(obj.result, keys);
    if (obj.data)   return extractText(obj.data, keys);
    return '';
  }

  function switchToTab(name) {
    document.querySelector(`.tr-tab[data-tab="${name}"]`)?.click();
  }

  /* ===== 번역 실행 (크레딧 확인 후) ===== */
  document.addEventListener('translation:credit-confirmed', async () => {
    if (!window.TR_CONFIG?.translateUrl) return;
    const transPane    = document.querySelector('.tr-trans-text');
    const reportScroll = document.querySelector('.tr-report-scroll');

    if (translateBtn) { translateBtn.disabled = true; translateBtn.style.opacity = '0.6'; }
    if (transPane) {
      transPane.style.color = 'var(--color-text-muted)';
      transPane.innerHTML = `
        <div class="tr-loading-state">
          <div class="tr-loading-spinner"></div>
          <p class="tr-loading-text">번역 중입니다...</p>
          <p class="tr-loading-sub">AI가 회차를 번역하고 있어요. 잠시만 기다려 주세요.</p>
        </div>`;
    }
    switchToTab('translation');

    try {
      const res = await fetch(window.TR_CONFIG.translateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.TR_CONFIG.csrfToken,
        },
        body: JSON.stringify({
          targetCountry: getActiveLang(),
          includeInternal: false,
          glossaryTerms: (() => {
            const lang = getActiveLang();
            const versions = trVersionsByLang[lang] || [];
            const latest = versions[versions.length - 1];
            const glossary = latest?.result?.glossaryCandidates || [];
            return glossary
              .filter(g => g && Number(g.applied) === 1)
              .map(g => ({
                source: g.source || g.original_word || '',
                target: g.suggested_target || g.translated_word || '',
              }))
              .filter(g => g.source);
          })(),
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        if (transPane) transPane.innerHTML = `<p style="color:#ff2d55;">${escapeHtml(data.error || '번역에 실패했습니다.')}</p><p style="color:var(--color-text-muted);font-size:13px;margin-top:6px;">저장된 결과가 있으면 잠시 후 자동으로 표시됩니다…</p>`;
        pollSavedAfterFail(getActiveLang());
        return;
      }

      const result = data.result || {};
      // 번역문이 비어 있으면(실패/빈 응답) 버전을 만들지 않음
      const translatedText = result.finalTranslation
        || extractText(result, ['translatedText', 'translation', 'translated', 'text', 'targetText']);
      if (!translatedText || !String(translatedText).trim()) {
        if (transPane) transPane.innerHTML = '<p style="color:#ff2d55;">번역 결과를 받지 못했어요.</p><p style="color:var(--color-text-muted);font-size:13px;margin-top:6px;">저장된 결과가 있으면 잠시 후 자동으로 표시됩니다…</p>';
        pollSavedAfterFail(getActiveLang());
        return;
      }
      // 번역 결과를 버전 목록에 추가하고 화면에 표시
      addTranslationVersion(getActiveLang(), result);
    } catch (e) {
      if (transPane) transPane.innerHTML = '<p style="color:#ff2d55;">네트워크 오류가 발생했습니다.</p><p style="color:var(--color-text-muted);font-size:13px;margin-top:6px;">저장된 결과가 있으면 잠시 후 자동으로 표시됩니다…</p>';
      pollSavedAfterFail(getActiveLang());
    } finally {
      if (translateBtn) { translateBtn.disabled = false; translateBtn.style.opacity = ''; }
    }
  });

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 번역 응답이 실패/지연으로 화면에 못 떴을 때, 모델 서버가 DB에 저장했을 수 있으니
  // 저장본을 몇 차례 자동 재조회 → 새 번역본이 보이면 그때 표시한다.
  let pollTimer = null;
  function pollSavedAfterFail(lang) {
    if (!window.TR_CONFIG || !window.TR_CONFIG.listUrl) return;
    if (pollTimer) clearInterval(pollTimer);
    const haveIds = () => (trVersionsByLang[lang] || [])
      .filter(v => v.translationId).map(v => String(v.translationId));
    let tries = 0;
    pollTimer = setInterval(async () => {
      tries++;
      try {
        const res = await fetch(window.TR_CONFIG.listUrl);
        const data = await res.json();
        if (data.ok && Array.isArray(data.items)) {
          const had = haveIds();
          const fresh = data.items.find(it => (it.lang || 'EN') === lang
            && it.translatedText && String(it.translatedText).trim()
            && !had.includes(String(it.id)));
          if (fresh) {
            clearInterval(pollTimer); pollTimer = null;
            const list = trVersionsByLang[lang] || (trVersionsByLang[lang] = []);
            const v = { n: list.length + 1, date: fresh.createdAt || '', result: buildResultFromSaved(fresh), translationId: fresh.id };
            list.push(v);
            while (list.length > 3) list.shift();
            if (getActiveLang() === lang) selectVersion(v);
            return;
          }
        }
      } catch (e) { /* 무시하고 다음 시도 */ }
      if (tries >= 18) { clearInterval(pollTimer); pollTimer = null; }  // 5초 × 18 ≈ 90초
    }, 5000);
  }

  // 줄바꿈 기준으로 문단(<p>)으로 나눠 렌더링 (단일 \n도 문단으로 처리)
  function splitParagraphs(text) {
    return String(text).split(/\n/).map(p => p.trim()).filter(p => p.length > 0);
  }
  function renderParagraphs(text) {
    return splitParagraphs(text)
      .map(p => `<p>${escapeHtml(p)}</p>`)
      .join('');
  }

  /* ===== 번역 리포트 렌더링 ===== */
  function reportSection(title, innerHtml) {
    return (
      `<section style="margin-bottom:24px;">` +
      `<h3 style="font-size:15px;font-weight:700;color:var(--color-text);margin:0 0 10px;">${escapeHtml(title)}</h3>` +
      innerHtml +
      `</section>`
    );
  }

  const REPORT_CHECK_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function reportStatChip(label, n, variant) {
    const bg = variant === 'pink' ? '#FBEAF0' : '#EEEDFE';
    return '<div class="tr-report-stat-chip" style="background:' + bg + ';border-color:transparent;">' +
      '<span class="tr-stat-label">' + label + '</span>' +
      '<span class="tr-stat-count">' + n + '<em> 건</em></span></div>';
  }

  function renderReport(result) {
    const tr = result.translationReport || {};
    const r = result.translationRationale || {};

    // 명세 정규화
    const summary = result.summary || tr.summary || r.overview || '';
    const inspection = Array.isArray(result.inspectionReport) ? result.inspectionReport
                     : (Array.isArray(tr.inspectionReport) ? tr.inspectionReport : []);
    const cultural = inspection.filter(d => d && d.reviewerType === 'cultural');
    const endnotes = Array.isArray(result.readerEndnotes) ? result.readerEndnotes
                   : (Array.isArray(tr.readerEndnotes) ? tr.readerEndnotes : []);
    const glossaryRaw = Array.isArray(result.glossaryCandidates) ? result.glossaryCandidates
                      : (Array.isArray(tr.glossaryCandidates) ? tr.glossaryCandidates : []);
    // 이미 확정된 고유명사(이전 화에서 체크)는 리포트 목록에서 제외
    const confirmedSet = confirmedGlossaryByLang[getActiveLang()] || new Set();
    const glossary = glossaryRaw.filter(g => {
      const src = g.source || g.original_word || '';
      // 이미 확정됐고 이번 화에서도 applied=1이면 제외 (applied=0이면 이번 화에서 체크 해제한 것이므로 표시)
      return !(confirmedSet.has(src) && Number(g.applied) !== 1);
    });

    if (!summary && !cultural.length && !endnotes.length && !glossary.length) {
      return '<div class="tr-report-empty">번역 리포트가 없습니다. 번역을 완료하면 리포트가 생성됩니다.</div>';
    }

    function checkItem(term, desc, on, type, idx) {
      const dataAttrs = (type !== undefined)
        ? ' data-check-type="' + type + '" data-check-idx="' + idx + '"'
        : '';
      return '<div class="tr-check-item' + (on ? ' tr-check-on' : '') + '"' + dataAttrs + '>' +
        '<div class="tr-check-box">' + (on ? REPORT_CHECK_SVG : '') + '</div>' +
        '<div class="tr-check-body">' +
          '<div class="tr-check-term">' + escapeHtml(term) + '</div>' +
          (desc ? '<div class="tr-check-desc">' + escapeHtml(desc) + '</div>' : '') +
        '</div></div>';
    }
    const emptyMsg = '<div class="tr-check-desc">항목이 없습니다.</div>';

    const glossaryList = glossary.length
      ? glossary.map((g, i) => checkItem(
          g.source || g.original_word || '',
          (g.suggested_target ? '↔ ' + g.suggested_target : (g.translated_word ? '↔ ' + g.translated_word : '')),
          Number(g.applied) === 1, 'glossary', i)).join('')
      : emptyMsg;

    const endnoteList = endnotes.length
      ? endnotes.map((n, i) => (typeof n === 'string'
          ? checkItem(n, '', false, 'endnote', i)
          : checkItem(n.keyword || '', n.koreanNote || '', Number(n.applied) === 1, 'endnote', i))).join('')
      : emptyMsg;

    const culturalList = cultural.length
      ? '<ul class="tr-report-bullet-list">' + cultural.map(d => {
          const head = d.sourceSpan ? '<strong>' + escapeHtml(d.sourceSpan) + '</strong> – ' : '';
          return '<li>' + head + escapeHtml(d.problem || d.reason || '') + '</li>';
        }).join('') + '</ul>'
      : emptyMsg;

    return (
      '<div class="tr-report-strategy">' +
        '<div class="tr-report-strategy-title">문체 / 현지화 전략</div>' +
        '<div class="tr-report-strategy-desc">' +
          (summary ? escapeHtml(summary).replace(/\n/g, '<br>') : '제공된 전략 정보가 없습니다.') +
        '</div>' +
      '</div>' +
      '<div class="tr-report-stats">' +
        reportStatChip('고유 명사', glossary.length, 'purple') +
        reportStatChip('주석 추출', endnotes.length, 'pink') +
        reportStatChip('검수 항목', cultural.length, 'purple') +
      '</div>' +
      '<div class="tr-report-cards">' +
        '<div class="tr-report-card"><div class="tr-report-card-title">고유 명사 확정</div><div class="tr-report-checklist">' + glossaryList + '</div></div>' +
        '<div class="tr-report-card"><div class="tr-report-card-title">주석 삽입 추천</div><div class="tr-report-checklist">' + endnoteList + '</div></div>' +
        '<div class="tr-report-card"><div class="tr-report-card-title">문화권 유의사항</div>' + culturalList + '</div>' +
      '</div>'
    );
  }

  // ── 미주 섹션 렌더링 ──────────────────────────────────────────
  function renderEndnotesSection(endnotes) {
    if (!Array.isArray(endnotes)) return '';
    const applied = endnotes.filter(n => typeof n !== 'string' && Number(n.applied) === 1);
    if (!applied.length) return '';
    const lines = applied.map((n, i) => {
      const keyword = n.targetKeyword || n.keyword || '';
      const note    = n.targetNote || '';
      return `[${i + 1}] ${escapeHtml(keyword)}${note ? ': ' + escapeHtml(note) : ''}`;
    }).join('\n');
    return '<div class="tr-endnotes-section">'
      + '<hr class="tr-endnotes-divider">'
      + '<p class="tr-endnotes-title">📌 미주</p>'
      + '<pre class="tr-endnotes-body">' + lines + '</pre>'
      + '</div>';
  }

  // 번역 텍스트 + 인라인 마커를 HTML로 렌더링
  function renderParagraphsWithMarkers(text, endnotes, highlight) {
    const paragraphs = splitParagraphs(text);
    const applied = Array.isArray(endnotes)
      ? endnotes.filter(n => typeof n !== 'string' && Number(n.applied) === 1)
      : [];

    // 문단별 마커 정보: { pIdx: [{num, after}] }
    // after = 마커를 삽입할 단어 (해당 단어 바로 뒤에 삽입). null이면 문단 끝.
    const paraMarkers = {};
    applied.forEach((n, i) => {
      // targetKeyword 우선, 없으면 targetSentence 앞 40자로 문단 탐색
      const keyword = (n.targetKeyword || '').trim();
      const sentence = (n.targetSentence || '').trim();
      const searchKey = keyword || sentence.slice(0, 40);
      if (!searchKey) return;
      const pIdx = paragraphs.findIndex(p => p.includes(searchKey));
      if (pIdx !== -1) {
        if (!paraMarkers[pIdx]) paraMarkers[pIdx] = [];
        paraMarkers[pIdx].push({ num: i + 1, after: keyword || null });
      }
    });

    // 검수 챗봇 수정 구간 하이라이트(표시 전용). 각 텍스트는 문단 내 첫 매칭만.
    const hlCls = (highlight && highlight.cls) || 'tr-hl-applied';
    const hlTexts = highlight && Array.isArray(highlight.texts)
      ? highlight.texts.filter(t => typeof t === 'string' && t)
      : [];

    return paragraphs.map((p, pIdx) => {
      const markers = paraMarkers[pIdx] || [];
      const hlRanges = [];
      hlTexts.forEach(t => {
        const pos = p.indexOf(t);
        if (pos !== -1) hlRanges.push({ start: pos, end: pos + t.length });
      });
      if (!markers.length && !hlRanges.length) return `<p>${escapeHtml(p)}</p>`;

      // 미주 마커·하이라이트 삽입 위치를 모아 역순 삽입(앞 위치가 안 밀리도록)
      const inserts = [];
      markers.forEach(({ num, after }) => {
        let pos = p.length;
        if (after) { const k = p.indexOf(after); if (k !== -1) pos = k + after.length; }
        inserts.push({ pos, str: `@@M${num}@@` });
      });
      hlRanges.forEach(({ start, end }) => {
        inserts.push({ pos: start, str: '@@HLS@@' });
        inserts.push({ pos: end, str: '@@HLE@@' });
      });
      inserts.sort((a, b) => b.pos - a.pos);

      let result = p;
      inserts.forEach(({ pos, str }) => { result = result.slice(0, pos) + str + result.slice(pos); });

      // 이스케이프 후 플레이스홀더를 실제 태그로 교체
      const html = escapeHtml(result)
        .replace(/@@M(\d+)@@/g, (_, n) => `<sup class="tr-endnote-marker">[${n}]</sup>`)
        .replace(/@@HLS@@/g, `<mark class="${hlCls}">`)
        .replace(/@@HLE@@/g, '</mark>');
      return `<p>${html}</p>`;
    }).join('');
  }

  function refreshEndnotesInPane() {
    const transPane = document.querySelector('.tr-trans-text');
    if (!transPane) return;

    const endnotes = selectedVersion?.result?.readerEndnotes || [];
    const rawText  = (selectedVersion?.result?.finalTranslation || '')
      .replace(/\s*📌\s*미주[\s\S]*/u, '').trimEnd();

    if (!rawText) {
      const existing = transPane.querySelector('.tr-endnotes-section');
      if (existing) existing.remove();
      const html = renderEndnotesSection(endnotes);
      if (html) transPane.insertAdjacentHTML('beforeend', html);
      return;
    }

    // 번역 텍스트 + 인라인 마커 + 하단 미주 섹션 재렌더링
    transPane.innerHTML = renderParagraphsWithMarkers(rawText, endnotes)
      + renderEndnotesSection(endnotes);
  }

  // 리포트 체크박스 토글 (선택 사항 적용용) + DB 저장
  document.querySelector('.tr-report-scroll')?.addEventListener('click', async function (e) {
    const item = e.target.closest('.tr-check-item');
    if (!item) return;
    item.classList.toggle('tr-check-on');
    const box = item.querySelector('.tr-check-box');
    const isOn = item.classList.contains('tr-check-on');
    if (box) box.innerHTML = isOn ? REPORT_CHECK_SVG : '';

    const type = item.dataset.checkType;
    const idx  = Number(item.dataset.checkIdx);
    const url  = window.TR_CONFIG?.reportCheckUrl;
    if (!type || isNaN(idx) || !url) return;

    // selectedVersion 데이터에도 반영 (미주 섹션 즉시 갱신용)
    if (type === 'endnote') {
      const endnotes = selectedVersion?.result?.readerEndnotes;
      if (Array.isArray(endnotes) && endnotes[idx] && typeof endnotes[idx] !== 'string') {
        endnotes[idx].applied = isOn ? 1 : 0;
      }
      refreshEndnotesInPane();
    } else if (type === 'glossary') {
      const glossary = selectedVersion?.result?.glossaryCandidates;
      if (Array.isArray(glossary) && glossary[idx]) {
        glossary[idx].applied = isOn ? 1 : 0;
        // 메모리 confirmedSet도 즉시 업데이트
        const lang = getActiveLang();
        if (!confirmedGlossaryByLang[lang]) confirmedGlossaryByLang[lang] = new Set();
        const src = glossary[idx].source || glossary[idx].original_word || '';
        if (src) {
          if (isOn) confirmedGlossaryByLang[lang].add(src);
          else confirmedGlossaryByLang[lang].delete(src);
        }
      }
      if (isOn) trToast('다음 번역 시 해당 용어가 반영됩니다.');
    }

    // translationId 확보 (새 번역본은 ensureTranslationId로 DB에서 가져옴)
    const tid = await ensureTranslationId();
    if (!tid) return;

    // DB에 applied 상태 저장
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.TR_CONFIG?.csrfToken || '',
      },
      body: JSON.stringify({ translationId: tid, type, idx, applied: isOn }),
    }).catch(() => {});
  });

  /* ===== 번역 버전 관리 ===== */
  // 언어별로 버전 보관: { EN: [{n, date, result}], CN: [...], ... }
  const trVersionsByLang = {};
  // 작품 단위 확정 glossary: { EN: Set<string>, CN: Set<string>, ... }
  const confirmedGlossaryByLang = {};
  let selectedVersion = null;
  let currentPendingAction = null;

  function nowStr() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function renderTranslationResult(result) {
    const transPane    = document.querySelector('.tr-trans-text');
    const reportScroll = document.querySelector('.tr-report-scroll');
    const rawTranslated = result.finalTranslation
      || extractText(result, ['translatedText', 'translation', 'translated', 'text', 'targetText']);
    // 모델이 번역문 끝에 인라인으로 삽입한 미주 블록 제거 (하단 섹션으로 따로 렌더링)
    const translated = rawTranslated
      ? rawTranslated.replace(/\s*📌\s*미주[\s\S]*/u, '').trimEnd()
      : rawTranslated;

    if (transPane) {
      transPane.style.color = 'var(--color-text)';
      transPane.style.padding = '24px';
      const readerEndnotes = Array.isArray(result.readerEndnotes) ? result.readerEndnotes : [];
      transPane.innerHTML = translated
        ? renderParagraphsWithMarkers(translated, readerEndnotes)
          + renderEndnotesSection(readerEndnotes)
        : `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
      // 번역본 직접 수정 불가 — 수정은 검수 챗봇으로만 진행
      transPane.setAttribute('contenteditable', 'false');
      transPane.style.outline = 'none';
    }
    if (reportScroll) {
      reportScroll.classList.remove('is-empty');   // 리포트 내용이 있으면 빈 박스 테두리 제거
      reportScroll.innerHTML = renderReport(result);
    }
  }

  function emptyTransNotice() {
    const transPane    = document.querySelector('.tr-trans-text');
    const reportScroll = document.querySelector('.tr-report-scroll');
    if (transPane) {
      transPane.style.color = '';
      transPane.innerHTML = `
        <div class="tr-empty-state">
          <div class="tr-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <p class="tr-empty-title">아직 번역본이 없어요</p>
          <p class="tr-empty-desc">번역하기 버튼을 눌러 번역을 시작해 보세요.</p>
        </div>`;
    }
    if (reportScroll) {
      reportScroll.classList.add('is-empty');       // 번역본과 동일하게 테두리 박스 표시
      reportScroll.innerHTML = `
        <div class="tr-empty-state">
          <div class="tr-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <p class="tr-empty-title">아직 번역 리포트가 없어요</p>
          <p class="tr-empty-desc">번역을 완료하면 리포트가 생성됩니다.</p>
        </div>`;
    }
  }

  // 현재 선택된 언어의 버전 목록을 드롭다운에 렌더링
  function refreshVersionPanels() {
    const lang = getActiveLang();
    const list = trVersionsByLang[lang] || [];
    ['versionPanel2', 'versionPanel3'].forEach((panelId) => {
      const panel = document.getElementById(panelId);
      if (!panel) return;
      if (!list.length) {
        panel.innerHTML = '<p style="padding:12px 16px;color:var(--color-text-muted);font-size:13px;">번역 결과가 없습니다.</p>';
        return;
      }
      panel.innerHTML = '';
      list.forEach((v) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'tr-version-opt' + (selectedVersion === v ? ' active' : '');
        opt.innerHTML =
          `<span class="tr-ver-name">ver. ${v.n}</span>` +
          `<span class="tr-ver-date">${v.date}</span>`;
        opt.addEventListener('click', () => {
          selectVersion(v);
          panel.closest('.tr-version-dropdown')?.classList.remove('open');
        });
        panel.appendChild(opt);
      });
    });
  }

  function selectVersion(v) {
    if (!v) return;
    selectedVersion = v;
    renderTranslationResult(v.result);
    ['versionLabel2', 'versionLabel3'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `ver. ${v.n}`;
    });
    ['versionDate2', 'versionDate3'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v.date || '';
    });
    refreshVersionPanels();
    loadChatForVersion(v.translationId);
  }

  function addTranslationVersion(lang, result) {
    const list = trVersionsByLang[lang] || (trVersionsByLang[lang] = []);
    const v = { n: list.length + 1, date: nowStr(), result };
    list.push(v);
    // 언어별 최대 3개 유지(가장 오래된 것 제거)
    while (list.length > 3) list.shift();
    selectVersion(v);
  }

  // 언어 탭을 바꾸면 해당 언어의 버전으로 갱신
  document.querySelectorAll('.tr-lang-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const list = trVersionsByLang[getActiveLang()] || [];
      if (list.length) {
        selectVersion(list[list.length - 1]);
      } else {
        selectedVersion = null;
        emptyTransNotice();
        resetChat();                 // 번역본이 없으면 검수 챗봇도 환영 메시지만 남기고 비움
        currentPendingAction = null;
        refreshVersionPanels();
        ['versionLabel2', 'versionLabel3'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = '버전 선택';
        });
        ['versionDate2', 'versionDate3'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = '';
        });
      }
    });
  });

  /* ===== 페이지 로드 시 저장된 번역 불러오기(RDS) ===== */
  // DB 한 행 → 화면 렌더용 result 객체로 변환
  function buildResultFromSaved(item) {
    return {
      finalTranslation: item.translatedText || '',
      deliveryStatus: 'deliverable',
      summary: item.summary || '',
      // 명세(2026-06-24): inspectionReport = 전체 decisions 배열, 웹이 cultural 필터
      inspectionReport: Array.isArray(item.inspectionReport) ? item.inspectionReport : [],
      readerEndnotes: Array.isArray(item.readerEndnotes) ? item.readerEndnotes : [],
      glossaryCandidates: Array.isArray(item.glossaryCandidates) ? item.glossaryCandidates : [],
    };
  }

  async function loadSavedTranslations() {
    if (!window.TR_CONFIG?.listUrl) return;
    try {
      const res = await fetch(window.TR_CONFIG.listUrl);
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.items) || !data.items.length) return;

      // 확정 glossary 저장
      if (data.confirmedGlossary && typeof data.confirmedGlossary === 'object') {
        Object.entries(data.confirmedGlossary).forEach(([lang, terms]) => {
          if (!confirmedGlossaryByLang[lang]) confirmedGlossaryByLang[lang] = new Set();
          (terms || []).forEach(t => { if (t.source) confirmedGlossaryByLang[lang].add(t.source); });
        });
      }

      data.items.forEach((item) => {
        // 내용이 빈 번역본(실패/타임아웃 잔여 row)은 버전으로 만들지 않음
        if (!item.translatedText || !String(item.translatedText).trim()) return;
        const lang = item.lang || 'EN';
        const list = trVersionsByLang[lang] || (trVersionsByLang[lang] = []);
        list.push({ n: list.length + 1, date: item.createdAt || '', result: buildResultFromSaved(item), translationId: item.id });
      });

      // 현재 활성 언어에 저장본이 있으면 최신 버전 표시
      const cur = trVersionsByLang[getActiveLang()];
      if (cur && cur.length) selectVersion(cur[cur.length - 1]);
      else refreshVersionPanels();
    } catch (e) {
      console.error('[load translations]', e);
    }
  }

  /* ===== 수정 제안 카드 + 적용 ===== */
  function appendSuggestionCard(summary, edits) {
    if (!chatArea) return;
    // 원본은 길 수 있어 한 줄(말줄임)로만, 교체문(after)은 전문 표시. 데이터는 r.edits에 이미 있음.
    const list = Array.isArray(edits) ? edits : [];
    const diffHtml = list.map(ed => {
      const o = escapeHtml(ed && typeof ed.original === 'string' ? ed.original : '');
      const r = escapeHtml(ed && typeof ed.replacement === 'string' ? ed.replacement : '');
      return `<div style="margin:8px 0;font-size:13px;line-height:1.5;">` +
               `<div title="${o}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#c0392b;text-decoration:line-through;">${o}</div>` +
               `<div style="color:#1e7e34;word-break:break-word;">↳ ${r}</div>` +
             `</div>`;
    }).join('');
    const card = document.createElement('div');
    card.className = 'tr-chat-msg tr-chat-bot';
    card.innerHTML =
      `<div class="tr-chat-bot-icon"></div>` +
      `<div style="background:var(--color-surface,#fff);border:1px solid var(--color-primary-border,#cfc3fb);border-radius:12px;padding:14px;max-width:100%;">` +
        `<p style="font-weight:700;margin:0 0 6px;color:var(--color-text);">수정 제안</p>` +
        `<p style="margin:0 0 10px;color:var(--color-text-muted);font-size:13px;line-height:1.5;">${escapeHtml(summary)}</p>` +
        diffHtml +
        `<button type="button" class="tr-suggestion-apply">번역 제안 적용</button>` +
      `</div>`;
    card.querySelector('.tr-suggestion-apply').addEventListener('click', () => applyEdits(edits));
    chatArea.appendChild(card);
    chatArea.scrollTop = chatArea.scrollHeight;

    // 제안이 뜨면 바뀔 구간(original)을 본문에서 색1로 미리 하이라이트 + 정중앙으로(번역본 탭 전환)
    const pendingTexts = list.map(ed => ed && typeof ed.original === 'string' ? ed.original : '').filter(Boolean);
    if (pendingTexts.length) {
      switchToTab('translation');
      const base = transBodyText();
      if (base) renderBodyWithHighlight(base, pendingTexts, 'tr-hl-pending');
    }
  }

  // 번역본 전문(미주 블록 제거) — 하이라이트 재렌더의 기준 텍스트. 본문은 비편집(챗봇으로만 수정).
  function transBodyText() {
    return (selectedVersion?.result?.finalTranslation || '')
      .replace(/\s*📌\s*미주[\s\S]*/u, '').trimEnd();
  }

  // 본문을 미주 마커/섹션과 함께 다시 그리되, 지정 구간을 색(cls)으로 하이라이트하고 첫 구간을 정중앙으로.
  // 하이라이트는 표시 전용 — 저장(currentTransText=innerText)에는 태그가 빠지므로 DB/계약 영향 없음.
  function renderBodyWithHighlight(bodyText, highlightTexts, cls) {
    const transPane = document.querySelector('.tr-trans-text');
    if (!transPane) return;
    const endnotes = selectedVersion?.result?.readerEndnotes || [];
    const texts = Array.isArray(highlightTexts) ? highlightTexts : [highlightTexts];
    transPane.style.color = 'var(--color-text)';
    transPane.style.padding = '24px';
    transPane.innerHTML =
      renderParagraphsWithMarkers(bodyText, endnotes, { texts, cls })
      + renderEndnotesSection(endnotes);
    transPane.setAttribute('contenteditable', 'false');
    const mark = transPane.querySelector('mark.' + cls);
    if (mark) mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // 제안된 edits(원본 구간 → 교체문)를 현재 번역문에 정확 매칭(indexOf)으로 적용.
  // 모델이 original을 글자 그대로 인용하므로 fuzzy 추측 없이 그 구간만 교체 → CJK 안전·drift 없음.
  function applyEdits(edits) {
    const transPane = document.querySelector('.tr-trans-text');
    if (!transPane) return;
    const list = Array.isArray(edits) ? edits : [];
    let text = transBodyText() || currentTransText();
    let applied = 0;
    const missed = [];
    const appliedReplacements = [];
    for (const ed of list) {
      const original = ed && typeof ed.original === 'string' ? ed.original : '';
      const replacement = ed && typeof ed.replacement === 'string' ? ed.replacement : '';
      if (!original) continue;
      const i = text.indexOf(original);
      if (i === -1) { missed.push(original); continue; }
      text = text.slice(0, i) + replacement + text.slice(i + original.length);
      appliedReplacements.push(replacement);
      applied++;
    }

    if (applied > 0) {
      if (selectedVersion && selectedVersion.result) selectedVersion.result.finalTranslation = text;
      switchToTab('translation');
      // 바뀐 구간을 색2로 하이라이트 + 정중앙으로 (미주 마커/섹션 유지)
      renderBodyWithHighlight(text, appliedReplacements, 'tr-hl-applied');
    }

    if (applied === 0) {
      appendBotMessage('제안 위치를 번역본에서 찾지 못해 그대로 뒀어요. 수정할 부분을 조금 더 구체적으로 다시 말씀해 주세요.');
    } else if (missed.length) {
      appendBotMessage(`수정 ${applied}곳을 번역본에 반영했어요(${missed.length}곳은 위치를 찾지 못했습니다). "변경 사항 적용"을 눌러 저장하세요.`);
    } else {
      appendBotMessage('번역본에 반영했어요(지정한 부분만 교체). "변경 사항 적용"을 눌러 저장하세요.');
    }
  }

  /* ===== 변경 사항 적용(저장) / 번역 삭제 ===== */
  function currentTransText() {
    const transPane = document.querySelector('.tr-trans-text');
    return (transPane?.innerText || '').replace(/ /g, ' ').trim();
  }

  // 현재 버전의 translation_id 확보 — 없으면(방금 생성한 번역) DB에서 최신 것 조회
  async function ensureTranslationId() {
    if (selectedVersion && selectedVersion.translationId) return selectedVersion.translationId;
    if (!window.TR_CONFIG?.listUrl) return null;
    try {
      const res = await fetch(window.TR_CONFIG.listUrl);
      const data = await res.json();
      if (data.ok && Array.isArray(data.items) && data.items.length) {
        const lang = getActiveLang();
        const matches = data.items.filter((it) => (it.lang || 'EN') === lang);
        const pick = matches.length ? matches : data.items;
        const id = pick[pick.length - 1].id;
        if (selectedVersion) selectedVersion.translationId = id;
        return id;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // 토스트 / 확인 모달 (공통 AppUI)
  const trToast = (m) => (window.AppUI ? window.AppUI.toast(m) : alert(m));
  const trConfirm = () => (window.AppUI
    ? window.AppUI.confirm({ title: '이 번역본을 삭제할까요?', desc: '선택한 <strong>번역본</strong>이 삭제되며 복구할 수 없습니다.' })
    : Promise.resolve(window.confirm('이 번역본을 삭제할까요?')));

  document.querySelectorAll('.tr-apply-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.TR_CONFIG?.saveUrl) return;
      const text = currentTransText();
      if (!text) { trToast('번역본이 비어 있습니다.'); return; }
      btn.disabled = true;
      const old = btn.textContent; btn.textContent = '저장 중...';
      try {
        const tid = await ensureTranslationId();
        if (!tid) { trToast('저장할 번역본을 찾지 못했어요. 먼저 번역을 실행해 주세요.'); return; }
        const res = await fetch(window.TR_CONFIG.saveUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.TR_CONFIG.csrfToken },
          body: JSON.stringify({ translationId: tid, translatedText: text }),
        });
        const data = await res.json();
        if (data.ok) {
          if (selectedVersion && selectedVersion.result) selectedVersion.result.finalTranslation = text;
          trToast('선택 사항이 적용되었습니다.');
        } else {
          trToast(data.error || '저장에 실패했습니다.');
        }
      } catch (e) {
        trToast('네트워크 오류로 저장에 실패했습니다.');
      } finally {
        btn.disabled = false; btn.textContent = old;
      }
    });
  });

  document.querySelectorAll('.tr-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.TR_CONFIG?.deleteUrl) return;
      if (!(await trConfirm())) return;
      try {
        const tid = await ensureTranslationId();
        if (!tid) { trToast('삭제할 번역본을 찾지 못했어요.'); return; }
        const res = await fetch(window.TR_CONFIG.deleteUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.TR_CONFIG.csrfToken },
          body: JSON.stringify({ translationId: tid }),
        });
        const data = await res.json();
        if (data.ok) {
          trToast('번역본이 삭제되었습니다.');
          setTimeout(() => location.reload(), 1200);
        } else {
          trToast(data.error || '삭제에 실패했습니다.');
        }
      } catch (e) {
        trToast('네트워크 오류로 삭제에 실패했습니다.');
      }
    });
  });

  loadSavedTranslations();

});
