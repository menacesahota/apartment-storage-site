(function () {
  let tiers = [];
  let calloutFeePence = 0;
  let selectedMonths = null;
  let fp = null;
  let availabilityCache = {}; // "YYYY-MM" -> { maxPerDay, booked }

  const params = new URLSearchParams(window.location.search);
  const alertArea = document.getElementById('alert-area');

  if (params.get('cancelled') === '1') {
    alertArea.innerHTML = `<div class="error-box">Checkout was cancelled — your booking details were saved but no payment was taken. You can try again below.</div>`;
  }

  function formatGBP(pence) {
    return '£' + (pence / 100).toFixed(2);
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function toMonthKey(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`; }
  function toDateKey(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }

  async function fetchAvailability(monthKey) {
    if (availabilityCache[monthKey]) return availabilityCache[monthKey];
    const res = await fetch(`/api/availability?month=${monthKey}`);
    const data = await res.json();
    availabilityCache[monthKey] = data;
    return data;
  }

  function dayClassFn(availability) {
    return function (date, fmt, instance) {
      const key = toDateKey(date);
      const count = (availability && availability.booked && availability.booked[key]) || 0;
      const max = (availability && availability.maxPerDay) || 6;
      const dayEl = instance ? null : null;
      return null;
    };
  }

  function renderTiers() {
    const wrap = document.getElementById('tier-options');
    wrap.innerHTML = tiers.map(t => `
      <div class="tier-option" data-months="${t.months}">
        <span class="t-label">${t.label}</span>
        <span class="t-price">${formatGBP(t.pricePerBoxPence)} / box / mo</span>
      </div>
    `).join('');
    wrap.querySelectorAll('.tier-option').forEach(el => {
      el.addEventListener('click', () => selectTier(parseInt(el.dataset.months, 10)));
    });
    const preselect = parseInt(params.get('months'), 10);
    selectTier(tiers.find(t => t.months === preselect) ? preselect : tiers[0].months);
  }

  function selectTier(months) {
    selectedMonths = months;
    document.querySelectorAll('.tier-option').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.months, 10) === months);
    });
    updateSummary();
  }

  function updateSummary() {
    const tier = tiers.find(t => t.months === selectedMonths);
    const boxes = Math.max(1, parseInt(document.getElementById('boxes').value, 10) || 0);
    if (!tier) return;
    const fee = tier.months >= 12 ? 0 : calloutFeePence;
    const dueToday = tier.pricePerBoxPence * boxes + fee;

    document.getElementById('sum-plan').textContent = tier.label;
    document.getElementById('sum-boxes').textContent = boxes;
    document.getElementById('sum-perbox').textContent = formatGBP(tier.pricePerBoxPence);
    document.getElementById('sum-fee').textContent = fee > 0 ? formatGBP(fee) : 'Waived';
    document.getElementById('sum-total').textContent = formatGBP(dueToday);
  }

  async function initCalendar() {
    const today = new Date();
    fp = flatpickr('#collectionDate', {
      minDate: 'today',
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'D j M Y',
      onMonthChange: async (selectedDates, dateStr, instance) => {
        await refreshMonthAvailability(instance);
      },
      onOpen: async (selectedDates, dateStr, instance) => {
        await refreshMonthAvailability(instance);
      },
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        // placeholder, coloring applied in refreshMonthAvailability
      }
    });
    await refreshMonthAvailability(fp);
  }

  async function refreshMonthAvailability(instance) {
    const viewDate = instance.currentYear !== undefined
      ? new Date(instance.currentYear, instance.currentMonth, 1)
      : new Date();
    const monthKey = toMonthKey(viewDate);
    const availability = await fetchAvailability(monthKey);

    const dayEls = instance.calendarContainer.querySelectorAll('.flatpickr-day');
    dayEls.forEach(el => {
      if (!el.dateObj) return;
      const key = toDateKey(el.dateObj);
      const count = (availability.booked && availability.booked[key]) || 0;
      const max = availability.maxPerDay || 6;
      el.classList.remove('avail-low', 'avail-mid', 'avail-full');
      if (count >= max) {
        el.classList.add('flatpickr-disabled');
        el.style.textDecoration = 'line-through';
        el.style.color = '#c0392b';
      } else if (count >= max - 1) {
        el.style.boxShadow = 'inset 0 -3px 0 #e29e00';
      } else {
        el.style.boxShadow = 'inset 0 -3px 0 #2a9d5c';
      }
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Processing…';
    alertArea.innerHTML = '';

    const payload = {
      propertyName: document.getElementById('propertyName').value.trim(),
      contactName: document.getElementById('contactName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      boxes: parseInt(document.getElementById('boxes').value, 10),
      contractMonths: selectedMonths,
      collectionDate: document.getElementById('collectionDate').value,
      notes: document.getElementById('notes').value.trim()
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alertArea.innerHTML = `<div class="error-box">${data.error || 'Something went wrong. Please try again.'}</div>`;
        btn.disabled = false;
        btn.textContent = 'Continue to payment';
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alertArea.innerHTML = `<div class="success-box">Booking #${data.bookingId} received. ${data.warning || 'We will be in touch to confirm payment.'}</div>`;
        btn.disabled = false;
        btn.textContent = 'Continue to payment';
      }
    } catch (err) {
      console.error(err);
      alertArea.innerHTML = `<div class="error-box">Network error — please try again.</div>`;
      btn.disabled = false;
      btn.textContent = 'Continue to payment';
    }
  }

  async function init() {
    const res = await fetch('/api/pricing');
    const data = await res.json();
    tiers = data.tiers;
    calloutFeePence = data.calloutFeePence;
    renderTiers();
    document.getElementById('boxes').addEventListener('input', updateSummary);
    document.getElementById('booking-form').addEventListener('submit', handleSubmit);
    await initCalendar();
  }

  init();
})();
