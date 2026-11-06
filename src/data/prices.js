// Prices and categories. Change the numbers here; no code needed.
export const PRICES = {
  registrationFee: 35000,   // paid to the Registration Officer
  fixerFee: 5000,           // the "queue-skip" man (a scam; never needed to win)
  haggleDiscount: 0.1,      // 10% off at the kiosk if you haggle nicely
};

// Things the Supplies Kiosk sells. "required" = needed for registration.
export const KIOSK_ITEMS = [
  { id: 'photos', icon: '📸', name: 'Passport photographs (4)', price: 1500, required: true },
  { id: 'copies', icon: '📄', name: 'Photocopies of your documents', price: 800, required: true },
  { id: 'pen', icon: '🖊️', name: 'Biro pen', price: 200 },
  { id: 'zobo', icon: '🥤', name: 'Cold zobo drink', price: 300 },
  { id: 'pie', icon: '🥧', name: 'Meat pie', price: 700 },
  { id: 'airtime', icon: '📶', name: 'Airtime and data (₦1,000)', price: 1000 },
];

// Icons for the wallet history
export const CATEGORIES = {
  allowance: { icon: '💵', label: 'Allowance' },
  food: { icon: '🍲', label: 'Food' },
  fees: { icon: '🏫', label: 'School fees' },
  supplies: { icon: '🛒', label: 'Supplies' },
  scam: { icon: '⚠️', label: 'Lost to a scam' },
  other: { icon: '💳', label: 'Other' },
};
