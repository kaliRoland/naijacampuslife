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

// The "how to play" card shown on the first visit (and from the ? button). Edit freely.
export const HELP = {
  title: "Welcome to Lion's Den",
  goal: "You've just arrived at Lion's Den University in Lagos with ₦50,000 from Mummy. Your first job: register for the semester. Spend wisely, and be careful who you trust.",
  steps: [
    'Walk through the Main Gate.',
    'Buy <b>passport photos</b> and <b>photocopies</b> at the <b>Supplies Kiosk</b> (🛒 on your left, just inside).',
    'Pay the <b>registration fee</b> at the <b>Registration desk</b> (📝 on your right, under the green canopy).',
    'Follow the <b>gold arrow</b> and the <b>gold star on the map</b> if you get lost.',
  ],
  controlsTouch: [
    '<b>Left stick</b>: walk',
    '<b>Drag the screen</b>: look around',
    '<b>Talk</b> button (gold, bottom right): talk to people with a ◆ above them',
    '<b>📱</b>: your phone, wallet and bag &nbsp; <b>🗺️</b>: campus map &nbsp; <b>🎥</b>: aerial view &nbsp; <b>🔊</b>: music on/off',
  ],
  controlsKeys: [
    '<b>W A S D</b> or arrow keys: walk',
    '<b>Drag the mouse</b>: look around',
    '<b>E</b>: talk to people with a ◆ above them',
    '<b>M</b>: campus map &nbsp; <b>V</b>: aerial view &nbsp; <b>📱</b>: phone, wallet and bag &nbsp; <b>🔊</b>: music on/off',
  ],
  gotIt: "Let's go!",
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
