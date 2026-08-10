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
        <div class="per">Billed monthly per box</div>
        <ul>
          <li>Delivery of empty boxes included</li>
          <li>Live collection-date booking</li>
          <li>${tier.months >= 12 ? 'Delivery & collection fee waived' : 'One-off delivery & collection fee applies'}</li>
          <li>Secure off-site storage</li>
        </ul>
        <a href="/booking.html?months=${tier.months}" class="btn btn-primary" style="text-align:center;">Choose this plan</a>
      </div>
    `).join('');

    const note = document.getElementById('callout-note');
    if (note) {
      note.innerHTML = `📦 A one-off delivery &amp; collection fee of ${formatGBP(data.calloutFeePence)} applies on 1, 3 and 6 month plans — waived automatically on 12 month contracts.`;
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
