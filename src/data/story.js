// All editable story text, prices and numbers live here. No code knowledge needed.
export const STARTING_ALLOWANCE = 50000;

export const TEXT = {
  objective_bus: 'Your bus is arriving...',
  objective_walk: 'Walk through the main gate.',
  // Week 2 objectives
  objective_register: 'Register: buy passport photos and photocopies at the Supplies Kiosk (left), then see the Registration Officer (right).',
  objective_fee: 'You have your documents. Pay the registration fee at the Registration desk (right).',
  objective_registered: "You're registered! Hostel allocation is next (coming in Week 3).",
  bankAlert: 'Allowance received from Mummy',
  talk: 'Talk',
};

export const GATE_CHOICE = {
  prompt: 'You step into campus with ₦50,000 in your account. A hungry stomach and a long queue ahead. What do you do first?',
  options: [
    {
      label: 'Buy jollof rice at the gate kiosk (₦1,500)',
      cost: 1500,
      reason: 'Jollof rice, gate kiosk',
      category: 'food',
      result: 'Sweet. Full belly, but the registration queue has grown. Pidgin: "No be small thing."',
    },
    {
      label: 'Go straight to registration, save your money',
      cost: 0,
      reason: '',
      category: 'other',
      result: 'You skip food and head for the queue. Discipline pays... maybe. Your stomach disagrees.',
    },
  ],
};
