// All editable story text, prices and numbers live here. No code knowledge needed.
export const STARTING_ALLOWANCE = 50000;

export const TEXT = {
  objective_bus: 'Your bus is arriving...',
  objective_walk: 'Walk through the main gate.',
  objective_done: 'Welcome to Lion\'s Den. (More coming in Week 2)',
  bankAlert: 'Allowance received from Mummy',
};

export const GATE_CHOICE = {
  prompt: 'You step into campus with ₦50,000 in your account. A hungry stomach and a long queue ahead. What do you do first?',
  options: [
    {
      label: 'Buy jollof rice at the gate kiosk (₦1,500)',
      cost: 1500,
      reason: 'Jollof rice, gate kiosk',
      result: 'Sweet. Full belly, but the registration queue has grown. Pidgin: "No be small thing."',
    },
    {
      label: 'Go straight to registration, save your money',
      cost: 0,
      reason: '',
      result: 'You skip food and head for the queue. Discipline pays... maybe. Your stomach disagrees.',
    },
  ],
};
