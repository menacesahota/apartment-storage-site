function formatGBP(pence) {
  return '£' + (pence / 100).toFixed(2);
}

async function loadPricing() {
  const grid = document.getElementById('pricing-grid');
  if (!grid) return;
  try {
    const res = await fetch('/api/pricing');
    const data = await res.json();

    grid.innerHTML = data.tiers.map((tier, i) => `
      <div class="price-card ${tier.months === 12 ? 'featured' : ''}">
        ${tier.badge ? `<div class="price-badge">${tier.badge}</div>` : ''}
        <div class="term">${tier.label}</div>
        <div class="amount">${formatGBP(tier.pricePerBoxPence)} <small>/ box / month</small></div>
        <ul>
          <li>Delivery included</li>
          <li>${tier.months >= 12 ? 'Collection fee waived' : 'One-off collection fee'}</li>
          <li>Secure storage</li>
        </ul>
        <a href="/booking.html?months=${tier.months}" class="btn btn-primary" style="text-align:center;">Choose this plan</a>
      </div>
    `).join('');

    const note = document.getElementById('callout-note');
    if (note) {
      note.innerHTML = `One-off ${formatGBP(data.calloutFeePence)} delivery &amp; collection fee on 1, 3 and 6 month plans — waived on 12 months.`;
    }

    const areaList = document.getElementById('area-list');
    if (areaList) {
      const areas = data.serviceArea.split('(')[1].replace(')', '').split(',').map(s => s.trim());
      areaList.innerHTML = areas.map(a => `<span class="area-chip">${a}</span>`).join('');
    }
  } catch (err) {
    console.error('Failed to load pricing', err);
  }
}
