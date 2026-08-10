(function () {
  const CATEGORIES = [
    { id: 'clothing', label: 'Seasonal clothing & bedding', boxes: 3 },
    { id: 'sports', label: 'Sports & outdoor gear', boxes: 3 },
    { id: 'books', label: 'Books, documents & files', boxes: 2 },
    { id: 'kitchen', label: 'Kitchen extras & small appliances', boxes: 2 },
    { id: 'decor', label: 'Decorations & keepsakes', boxes: 2 },
    { id: 'toys', label: "Kids' toys & games", boxes: 3 },
    { id: 'hobby', label: 'Hobby & craft supplies', boxes: 2 },
    { id: 'shoes', label: 'Off-season shoes & accessories', boxes: 2 }
  ];

  let baseBoxes = 0;
  const checked = new Set();

  const checkList = document.getElementById('check-list');
  const sizeOptions = document.getElementById('size-options');
  const totalEl = document.getElementById('rec-total');
  const cta = document.getElementById('rec-cta');

  function renderChecklist() {
    checkList.innerHTML = CATEGORIES.map(c => `
      <div class="check-item" data-id="${c.id}" data-boxes="${c.boxes}">
        <div class="ci-label">
          <span class="ci-box">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          </span>
          ${c.label}
        </div>
        <span class="ci-count">+${c.boxes} boxes</span>
      </div>
    `).join('');

    checkList.querySelectorAll('.check-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        if (checked.has(id)) {
          checked.delete(id);
          el.classList.remove('checked');
        } else {
          checked.add(id);
          el.classList.add('checked');
        }
        update();
      });
    });
  }

  function renderSizeOptions() {
    sizeOptions.querySelectorAll('.tier-option').forEach(el => {
      el.addEventListener('click', () => {
        sizeOptions.querySelectorAll('.tier-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        baseBoxes = parseInt(el.dataset.boxes, 10);
        update();
      });
    });
  }

  function update() {
    let total = baseBoxes;
    checked.forEach(id => {
      const cat = CATEGORIES.find(c => c.id === id);
      if (cat) total += cat.boxes;
    });
    total = Math.max(total, 1);
    totalEl.textContent = total;
    cta.href = `/booking.html?boxes=${total}`;
  }

  renderChecklist();
  renderSizeOptions();
  update();
})();
