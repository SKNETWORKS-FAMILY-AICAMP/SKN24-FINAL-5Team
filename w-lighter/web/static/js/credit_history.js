document.addEventListener('DOMContentLoaded', () => {
  const filterForm = document.getElementById('filterForm');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const resetFilter = document.getElementById('resetFilter');
  const filterChips = document.querySelectorAll('.filter-chip');
  const tablePanel = document.querySelector('.table-panel');
  const fmt = date => date.toISOString().split('T')[0];

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }

  function updateCreditBalance(balance) {
    document.querySelectorAll('.credit-chip').forEach(el => {
      el.textContent = `${formatNumber(balance)} C`;
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const months = Number.parseInt(chip.dataset.month, 10);
      const to = new Date();
      const from = new Date();
      from.setMonth(from.getMonth() - months);
      if (dateFrom) dateFrom.value = fmt(from);
      if (dateTo) dateTo.value = fmt(to);
      filterForm?.submit();
    });
  });

  dateFrom?.addEventListener('change', () => filterForm?.submit());
  dateTo?.addEventListener('change', () => filterForm?.submit());
  resetFilter?.addEventListener('click', () => {
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = fmt(new Date());
    filterForm?.submit();
  });

  async function cancelPaymentDemo(paymentId) {
    const url = tablePanel?.dataset.cancelUrl;
    const csrf = tablePanel?.dataset.csrf;
    if (!url || !csrf) throw new Error('구매 취소 설정을 찾을 수 없습니다.');

    const form = new FormData();
    form.append('payment_id', paymentId);
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
      throw new Error(data.message || '구매 취소 상태 변경에 실패했습니다.');
    }
    return data;
  }

  // Sandbox demo only: do not call the Toss cancel API.
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const date = row?.cells[0]?.textContent.trim() || '';
      const plan = row?.cells[1]?.textContent.trim() || '';
      const price = row?.cells[3]?.textContent.trim() || '';
      alert(`[샌드박스 데모]\n${date} ${plan} (${price})\n실제 결제 취소 API는 호출하지 않고, 화면 동작만 제공합니다.`);
      btn.disabled = true;
      try {
        const result = await cancelPaymentDemo(btn.dataset.paymentId);
        if (typeof result.balance === 'number') updateCreditBalance(result.balance);
        const statusCell = btn.closest('td');
        if (statusCell) statusCell.innerHTML = '<span class="status-text">취소 완료</span>';
      } catch (error) {
        alert(error.message);
        btn.disabled = false;
      }
    });
  });
});
