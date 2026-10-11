// ─────────────────────────────────────────────────────────────
//  Everything you might want to change lives in this one file.
//  Edit the text between the quotes, save, and push to GitHub.
// ─────────────────────────────────────────────────────────────

export const CONFIG = {
  name: 'Rajiea',
  nameAr: 'راجية',
  fromName: 'Aly',

  // The words that cycle after "Dentist ·" in the big title.
  taglines: [
    'smile-maker',
    'full of hope',
    'cavity’s worst nightmare',
    'one of a kind',
    'sugar-bug hunter',
  ],

  // What the 3D Rajiea says when you tap her.
  bubbleLines: [
    'Hi, I’m Rajiea! 🦷',
    'Did you floss today? 👀',
    'Two minutes, twice a day ⏱️',
    'Spit, don’t rinse! 💧',
    'Sugar bugs fear me 🦠',
    'Best accessory? A healthy smile 💖',
    'Open wide… just kidding 😄',
    'Brush gently — your gums will thank you ✨',
  ],

  // ── Quiz: "How well do you know Rajiea?" ──
  // `answer` is the position of the right option, starting from 0.
  // Add your own questions about her here — keep 4 options each.
  quiz: [
    {
      q: 'What does Rajiea do for a living?',
      options: ['Pilot', 'Dentist', 'Chef', 'Architect'],
      answer: 1,
      why: 'Dr. Rajiea — professional smile-maker 🦷',
    },
    {
      q: 'Her Arabic name, راجية, comes from رجاء. What does it mean?',
      options: ['Moon', 'Rose', 'Hope', 'Brave'],
      answer: 2,
      why: 'راجية means “full of hope”. Fitting, right?',
    },
    {
      q: 'What is Rajiea’s sworn enemy?',
      options: ['Cavities', 'Mondays', 'Spiders', 'Traffic'],
      answer: 0,
      why: 'Sugar bugs, beware. She’s on to you 🦠',
    },
    {
      q: 'What colour is her phone case?',
      options: ['Black', 'Clear', 'Red', 'Blue'],
      answer: 2,
      why: 'Red — you can spot it in every mirror selfie 📱',
    },
    {
      q: 'Which accessory has she worn since she was a baby?',
      options: ['Sunglasses', 'A gold bracelet', 'A watch', 'A hair clip'],
      answer: 1,
      why: 'A gold bracelet — Little Rajiea had one too ✨',
    },
    {
      q: 'How many teeth does a grown-up usually have?',
      options: ['24', '28', '30', '32'],
      answer: 3,
      why: '32, counting the four wisdom teeth. She could name them all.',
    },
    {
      q: 'How long would Rajiea tell you to brush for?',
      options: ['30 seconds', '1 minute', '2 minutes', '10 minutes'],
      answer: 2,
      why: 'Two full minutes, twice a day ⏱️',
    },
  ],
  passMark: 5, // right answers needed to win a prize

  // One of these is picked at random when someone wins the quiz.
  prizes: [
    { icon: '☕', title: 'A coffee of your choice', note: 'Any size. Extra whipped cream allowed.' },
    { icon: '💐', title: 'A bouquet of flowers', note: 'Pink ones, obviously.' },
    { icon: '🍰', title: 'A dessert night', note: 'Dentist-approved… mostly.' },
    { icon: '✨', title: 'One wish, granted', note: 'Within reason. Probably.' },
  ],
  claimLine: 'Screenshot this and send it to Aly to claim 💌',

  // What Little Rajiea says when you tap her.
  babyLines: ['Hehe! 🧸', 'Again! Again!', 'Look at my bracelet ✨', 'One day I’ll be a dentist 🦷', 'Peekaboo! 👀'],

  // ── Smile School: myth or fact cards ──
  tips: [
    { claim: 'Brushing harder gets your teeth cleaner.', fact: false, why: 'Gentle circles with a soft brush clean best. Scrubbing hard can wear enamel and hurt your gums.' },
    { claim: 'You should brush for two minutes, twice a day.', fact: true, why: 'Morning and night, two full minutes — about 30 seconds for each part of your mouth.' },
    { claim: 'Rinse with water straight after brushing.', fact: false, why: 'Spit, don’t rinse! A little toothpaste left behind keeps the fluoride protecting your teeth.' },
    { claim: 'Tooth enamel is the hardest thing in your body.', fact: true, why: 'Harder than bone! But it can’t grow back, so look after it.' },
    { claim: 'Sugar-free drinks can’t harm your teeth.', fact: false, why: 'Many are acidic — and acid can soften enamel even with zero sugar.' },
    { claim: 'Swap your toothbrush every 3 months.', fact: true, why: 'Or sooner if the bristles look frayed. Tired bristles don’t clean well.' },
    { claim: 'If you brush well, you can skip flossing.', fact: false, why: 'A brush can’t reach between teeth. Floss gets the spots where cavities love to hide.' },
    { claim: 'Grown-ups usually have 32 teeth.', fact: true, why: 'Counting the four wisdom teeth. Kids have 20 baby teeth.' },
  ],

  // ── The letter in the envelope at the bottom of the page ──
  note: {
    greeting: 'Dear Rajiea,',
    body: [
      'This little corner of the internet is all yours.',
      'Thank you for every smile you fix — and every smile you cause.',
      'Keep shining. The world needs more people like you. ✨',
    ],
    signoff: '— Aly',
  },
};
