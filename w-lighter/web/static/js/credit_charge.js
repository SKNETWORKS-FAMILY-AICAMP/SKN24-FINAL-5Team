document.addEventListener('DOMContentLoaded', () => {
  const planWrap = document.getElementById('plans');
  const cards = document.querySelectorAll('.plan-card');
  const paymentBox = document.getElementById('tossPaymentBox');
  const paymentTitle = document.getElementById('tossPaymentTitle');

  if (!planWrap) return;

  function setLoading(card, isLoading) {
    const button = card.querySelector('.select-btn');
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? '준비 중...' : '선택';
  }

  function showPaymentStatus(message) {
    // 안내 박스는 띄우지 않음 (결제 모달이 모든 정보를 보여줌)
    if (paymentBox) paymentBox.style.display = 'none';
  }

  async function preparePayment(planCode) {
    const form = new FormData();
    form.append('plan', planCode);

    const response = await fetch(planWrap.dataset.prepareUrl, {
      method: 'POST',
      headers: {
        'X-CSRFToken': planWrap.dataset.csrf,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: form,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.message || '결제 준비에 실패했습니다.');
    }
    return data;
  }

  async function renderTossPaymentWindow(payment) {
    if (!window.TossPayments) {
      throw new Error('토스페이먼츠 SDK를 불러오지 못했습니다.');
    }

    const tossPayments = TossPayments(payment.clientKey);
    const widgets = tossPayments.widgets({
      customerKey: payment.customerKey,
    });

    await widgets.setAmount({
      currency: payment.currency || 'KRW',
      value: payment.amount,
    });

    const paymentWindow = await widgets.renderPaymentWindow();

    // 결제 모달이 모든 정보를 보여주므로, 뒤에 남는 안내 박스는 숨김
    paymentBox.style.display = 'none';

    paymentWindow.on('paymentRequest', async () => {
      await widgets.requestPayment({
        orderId: payment.orderId,
        orderName: payment.orderName,
        successUrl: payment.successUrl,
        failUrl: payment.failUrl,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
      });
    });
  }

  cards.forEach(card => {
    card.querySelector('.select-btn')?.addEventListener('click', async () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      setLoading(card, true);
      showPaymentStatus('결제창을 준비하고 있습니다...');

      try {
        const payment = await preparePayment(card.dataset.plan);
        await renderTossPaymentWindow(payment);
      } catch (error) {
        showPaymentStatus(error.message || '결제창을 준비하지 못했습니다.');
        alert(error.message || '결제창을 준비하지 못했습니다.');
      } finally {
        setLoading(card, false);
      }
    });
  });
});
