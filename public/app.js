function formatGBP(pence) {
  return '£' + (pence / 100).toFixed(2);
}

let PRICING_DATA = null;

async function fetchPricingData() {
  if (PRICING_DATA) return PRICING_DATA;
  const res = await fetch('/api/pricing');
  PRICING_DATA = await res.json();
  return PRICING_DATA;
}

function renderAreaList(data) {
  const areaList = document.getElementById('area-list');
  if (!areaList) return;
  const areas = data.serviceArea.split('(')[1].replace(')', '').split(',').map(s => s.trim());
  areaList.innerHTML = areas.map(a => `<span class="area-chip">${a}</span>`).join('');
}

function initCalculator(data) {
  const tierWrap = document.getElementById('calc-tier-options');
  if (!tierWrap) return;

  const boxesInput = document.getElementById('calc-boxes');
  const cta = document.getElementById('calc-cta');
  let selectedMonths = data.tiers[0].months;

  tierWrap.innerHTML = data.tiers.map(t => `
    <div class="tier-option" data-months="${t.months}">
      <span class="t-label">${t.label}</span>
      <span class="t-price">${formatGBP(t.pricePerBoxPence)} / box / mo</span>
    </div>
  `).join('');

  function selectTier(months) {
    selectedMonths = months;
    tierWrap.querySelectorAll('.tier-option').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.months, 10) === months);
    });
    update();
  }

  function update() {
    const tier = data.tiers.find(t => t.months === selectedMonths);
    let boxes = parseInt(boxesInput.value, 10);
    if (!Number.isInteger(boxes) || boxes < (data.minBoxes || 1)) boxes = data.minBoxes || 1;
    if (boxes > (data.maxBoxes || 100)) boxes = data.maxBoxes || 100;

    const fee = tier.months >= 12 ? 0 : data.calloutFeePence;
    const monthly = tier.pricePerBoxPence * boxes;
    const dueToday = monthly + fee;

    document.getElementById('calc-perbox').textContent = formatGBP(tier.pricePerBoxPence);
    document.getElementById('calc-boxes-out').textContent = boxes;
    document.getElementById('calc-monthly').textContent = formatGBP(monthly);
    document.getElementById('calc-fee').textContent = fee > 0 ? formatGBP(fee) : 'Waived';
    document.getElementById('calc-total').textContent = formatGBP(dueToday);

    if (cta) cta.href = `/booking.html?months=${tier.months}&boxes=${boxes}`;
  }

  tierWrap.querySelectorAll('.tier-option').forEach(el => {
    el.addEventListener('click', () => selectTier(parseInt(el.dataset.months, 10)));
  });
  boxesInput.addEventListener('input', update);

  selectTier(selectedMonths);
}

async function loadPricing() {
  try {
    const data = await fetchPricingData();
    renderAreaList(data);
    initCalculator(data);
  } catch (err) {
    console.error('Failed to load pricing', err);
  }
}
