// Single source of truth for pricing. Change numbers here only.
const PRICING_TIERS = [
  { months: 1,  label: "1 month (rolling)", pricePerBoxPence: 999,  badge: null },
  { months: 3,  label: "3 month contract",  pricePerBoxPence: 849,  badge: "Save 15%" },
  { months: 6,  label: "6 month contract",  pricePerBoxPence: 699,  badge: "Save 30%" },
  { months: 12, label: "12 month contract", pricePerBoxPence: 599,  badge: "Save 40%" }
];

// One-off delivery (drop empty boxes) + collection (pick up full boxes) fee.
// Waived automatically for 12 month contracts.
const CALLOUT_FEE_PENCE = 1999;

// Soft daily cap on collections so the calendar can show live availability.
const MAX_COLLECTIONS_PER_DAY = 6;

const SERVICE_AREA = "West Midlands (Birmingham, Wolverhampton, Coventry, Solihull, Dudley, Walsall)";

function getTier(months) {
  return PRICING_TIERS.find(t => t.months === Number(months));
}

module.exports = { PRICING_TIERS, CALLOUT_FEE_PENCE, MAX_COLLECTIONS_PER_DAY, SERVICE_AREA, getTier };
