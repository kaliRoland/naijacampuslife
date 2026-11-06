// All conversations. Every line has an English version (en) and a Pidgin version (pcm).
// Edit the words freely. The structure:
//   node  = { who, en, pcm, auto?, shop?, opts? }
//   auto  = jump straight to another node if a condition is true (checked in order)
//   opts  = the player's choices: { en, pcm, next, cost?, reason?, category?, set?, requires? }
//   cost  = money taken from the wallet (the choice is greyed out if you cannot afford it)
//   set   = flags to remember, e.g. { fixerScammed: true }
//   Conditions: { has: ['photos'], flag: 'x', notFlag: 'x' }
//   next: null ends the conversation.
import { PRICES } from './prices.js';

const FEE = '₦' + PRICES.registrationFee.toLocaleString('en-NG');
const FIXER = '₦' + PRICES.fixerFee.toLocaleString('en-NG');

export const DIALOGUES = {
  // ------------------------------------------------------------------ Registration Officer
  officer: {
    start: 'o_start',
    nodes: {
      o_start: {
        who: 'Mrs. Adebayo (Registration Officer)',
        auto: [
          { if: { flag: 'registered' }, next: 'o_done' },
          { if: { flag: 'fixerScammed', notFlag: 'officerWarned' }, next: 'o_warn' },
        ],
        en: "Next! You're a fresher, right? Come, let me see your documents.",
        pcm: 'Next! You be fresher abi? Come, make I see your paper them.',
        opts: [
          { en: "I'm here to register.", pcm: 'I wan register.', next: 'o_check' },
          { en: 'How much is the fee?', pcm: 'How much be the fee?', next: 'o_feeinfo' },
          { en: 'Just looking around.', pcm: 'I just dey look around.', next: null },
        ],
      },
      o_warn: {
        who: 'Mrs. Adebayo (Registration Officer)',
        set: { officerWarned: true },
        en: "Ah, I saw that boy collecting money from you. He is NOT staff here. Many freshers fall for him. Pay only at this desk, and always ask for a receipt.",
        pcm: 'Ah, I see as that boy collect money for your hand. E no be staff for here o! Plenty fresher don fall for him hand. Pay only for this desk, and always collect receipt.',
        opts: [
          { en: "Thank you, ma. I've learnt.", pcm: 'Thank you ma. I don learn.', next: 'o_check' },
          { en: "He took ₦5,000 from me...", pcm: 'E carry ₦5,000 comot for me...', next: 'o_sorry' },
        ],
      },
      o_sorry: {
        who: 'Mrs. Adebayo (Registration Officer)',
        en: "Sorry. It hurts, I know. Take it as school fees for the street. Now, let's finish your registration.",
        pcm: 'Sorry my pikin. E dey pain, I know. Take am as street school fees. Now make we finish your registration.',
        opts: [{ en: 'Okay, ma.', pcm: 'Okay ma.', next: 'o_check' }],
      },
      o_feeinfo: {
        who: 'Mrs. Adebayo (Registration Officer)',
        en: `The registration fee is ${FEE}. You also need passport photographs and photocopies of your documents. The Supplies Kiosk is just over there.`,
        pcm: `The registration fee na ${FEE}. You go still need passport photo and photocopy of your paper. The Supplies Kiosk dey just over there.`,
        opts: [
          { en: 'Can I pay half now?', pcm: 'I fit pay half now?', next: 'o_half' },
          { en: "Alright, I'll sort my documents.", pcm: 'Alright, I go arrange my paper.', next: null },
        ],
      },
      o_half: {
        who: 'Mrs. Adebayo (Registration Officer)',
        en: 'No instalments this week. Full payment, or you wait for the queue next time. Rules are rules.',
        pcm: 'No part-part payment this week. Full payment, or you go wait for next queue. Rules na rules.',
        opts: [{ en: 'Okay, ma.', pcm: 'Okay ma.', next: null }],
      },
      o_check: {
        who: 'Mrs. Adebayo (Registration Officer)',
        auto: [{ if: { has: ['photos', 'copies'] }, next: 'o_fee' }],
        en: "Your passport photographs and photocopies? I don't see them. Go to the Supplies Kiosk first, then come back. Don't waste my time.",
        pcm: 'Where your passport photo and photocopy? I no see anything. Go the Supplies Kiosk first, then come back. No waste my time.',
        opts: [
          { en: 'Please, can you manage me this once?', pcm: 'Abeg, you no fit manage me this once?', next: 'o_manage' },
          { en: "Okay, I'm going.", pcm: 'Okay, I dey go.', next: null },
        ],
      },
      o_manage: {
        who: 'Mrs. Adebayo (Registration Officer)',
        en: 'Manage you? If everybody comes empty-handed, who will do my job for me? Go and get them. Today na today.',
        pcm: 'Manage you? If everybody come empty hand, who go do my work for me? Go bring am. Today na today.',
        opts: [{ en: 'Sorry, ma.', pcm: 'Sorry ma.', next: null }],
      },
      o_fee: {
        who: 'Mrs. Adebayo (Registration Officer)',
        en: `Good, your documents are complete. The registration fee is ${FEE}. Pay from your bank app, right here, and I will stamp your form.`,
        pcm: `Good, your paper complete. The registration fee na ${FEE}. Pay from your bank app, right here, and I go stamp your form.`,
        opts: [
          { en: `Pay ${FEE}`, pcm: `Pay ${FEE}`, cost: PRICES.registrationFee, reason: 'University registration fee', category: 'fees', next: 'o_paid' },
          { en: "I don't have that much now.", pcm: 'I no get that kind money now.', next: 'o_poor' },
        ],
      },
      o_poor: {
        who: 'Mrs. Adebayo (Registration Officer)',
        en: 'Then ask your people to send it. The queue will be here tomorrow. I will not.',
        pcm: 'Then tell your people make dem send am. The queue go dey here tomorrow. Me no go dey.',
        opts: [{ en: 'Okay, ma.', pcm: 'Okay ma.', next: null }],
      },
      o_paid: {
        who: 'Mrs. Adebayo (Registration Officer)',
        set: { registered: true },
        give: 'receipt',
        en: "*stamp!* You are now a registered student of Lion's Den University. Keep this receipt safe. Next stop: hostel allocation. And be careful with anyone offering you \"accommodation\" outside. Not everybody on this campus is your friend.",
        pcm: "*stamp!* You don become registered student of Lion's Den University. Keep this receipt well well. Next stop: hostel allocation. And make you careful with anybody wey dey offer you \"accommodation\" outside. Not everybody for this campus be your friend.",
        opts: [{ en: 'Thank you, ma!', pcm: 'Thank you ma!', next: null }],
      },
      o_done: {
        who: 'Mrs. Adebayo (Registration Officer)',
        en: "You're done here. Go and rest, hostel allocation is next. Next!",
        pcm: 'You don finish here. Go rest, hostel allocation na next. Next!',
        opts: [{ en: 'Thank you.', pcm: 'Thank you.', next: null }],
      },
    },
  },

  // ------------------------------------------------------------------ Supplies Kiosk (Aunty Ngozi)
  kiosk: {
    start: 'k_start',
    nodes: {
      k_start: {
        who: 'Aunty Ngozi (Supplies Kiosk)',
        en: 'Welcome, my dear! A fresher, I can tell. I have passport photographs, photocopies, pens, cold zobo and hot meat pie. What do you want?',
        pcm: 'Welcome my dear! Fresher abi? I fit tell. I get passport photo, photocopy, pen, cold zobo and hot meat pie. Wetin you want?',
        opts: [
          { en: 'Show me what you have.', pcm: 'Show me wetin you get.', next: 'k_shop' },
          { en: 'What do I need for registration?', pcm: 'Wetin I need for registration?', next: 'k_help' },
          { en: 'Please, reduce the price small.', pcm: 'Abeg, reduce the price small.', next: 'k_haggle', requires: { notFlag: 'haggled' } },
          { en: 'Just greeting, ma.', pcm: 'I just dey greet you ma.', next: null },
        ],
      },
      k_help: {
        who: 'Aunty Ngozi (Supplies Kiosk)',
        en: 'Passport photographs and photocopies of your documents. Without them, Mrs. Adebayo will not even look at you. Then ₦35,000 fee at her desk. Watch out for boys who say they can "help" you skip the queue.',
        pcm: 'Passport photo and photocopy of your paper. Without dem, Mrs. Adebayo no go even look your face. Then ₦35,000 fee for her desk. Look out for those boys wey dey say dem fit "help" you jump queue.',
        opts: [
          { en: 'Show me what you have.', pcm: 'Show me wetin you get.', next: 'k_shop' },
          { en: 'Thanks, ma.', pcm: 'Thank you ma.', next: null },
        ],
      },
      k_haggle: {
        who: 'Aunty Ngozi (Supplies Kiosk)',
        set: { haggled: true },
        en: 'Ah, my dear, you are sharp! Fine, first-day-fresher price. Ten percent off, but only because I like your face.',
        pcm: 'Ah my dear, you sharp o! Okay, fresher-first-day price. Ten percent off, but na only because I like your face.',
        opts: [{ en: 'God bless you, ma!', pcm: 'God bless you ma!', next: 'k_shop' }],
      },
      k_shop: {
        who: 'Aunty Ngozi (Supplies Kiosk)',
        shop: true,
        en: 'Pick what you want. Cash and transfer both dey work.',
        pcm: 'Choose wetin you want. Cash and transfer both dey work.',
        opts: [{ en: "That's all, thanks.", pcm: 'Na all, thank you.', next: 'k_bye' }],
      },
      k_bye: {
        who: 'Aunty Ngozi (Supplies Kiosk)',
        en: 'Come back anytime. And greet Mrs. Adebayo for me!',
        pcm: 'Come back anytime. And greet Mrs. Adebayo for me o!',
        opts: [{ en: 'I will.', pcm: 'I go do am.', next: null }],
      },
    },
  },

  // ------------------------------------------------------------------ The "Fixer" (optional scam)
  fixer: {
    start: 'f_start',
    nodes: {
      f_start: {
        who: 'Skido (The "Fixer")',
        en: 'Fresher! You want to skip this long queue? For just ' + FIXER + ", I'll connect you straight to the officer. No stress.",
        pcm: 'Fresher! You wan jump this long queue? For just ' + FIXER + ", I go connect you straight to the officer. No stress.",
        opts: [
          { en: `Pay ${FIXER}`, pcm: `Pay ${FIXER}`, cost: PRICES.fixerFee, reason: 'Queue "fast pass" (Skido)', category: 'scam', next: 'f_scam' },
          { en: 'How do I know you work here?', pcm: 'How I go take know say you dey work here?', next: 'f_proof' },
          { en: 'No, thanks.', pcm: 'No thanks.', next: null },
        ],
      },
      f_proof: {
        who: 'Skido (The "Fixer")',
        en: "Ah! My ID? I left it at home. Look, my oga is inside, he knows me. You're wasting time, the queue is moving. ₦5,000. Final.",
        pcm: 'Ah! My ID? I leave am for house. Look, my oga dey inside, e know me. You dey waste time, queue dey move. ₦5,000. Final.',
        opts: [
          { en: `Pay ${FIXER} anyway`, pcm: `Pay ${FIXER} anyhow`, cost: PRICES.fixerFee, reason: 'Queue "fast pass" (Skido)', category: 'scam', next: 'f_scam' },
          { en: "I'll take my chances in the queue.", pcm: 'I go stay for queue.', next: 'f_leave' },
        ],
      },
      f_leave: {
        who: 'Skido (The "Fixer")',
        en: "Suit yourself. You'll be standing there till night.",
        pcm: 'Do as you like. You go stand there till night.',
        opts: [{ en: '(Walk away)', pcm: '(Waka comot)', next: null }],
      },
      f_scam: {
        who: 'Skido (The "Fixer")',
        set: { fixerScammed: true },
        en: 'Perfect! Wait here, let me go and talk to the officer. Two minutes. *walks off quickly and disappears into the crowd*',
        pcm: 'Perfect! Wait here, make I go talk to the officer. Two minutes. *waka comot quick quick and vanish enter crowd*',
        opts: [{ en: '...Did I just get scammed?', pcm: '...Dem don chop me?', next: null }],
      },
    },
  },
};
