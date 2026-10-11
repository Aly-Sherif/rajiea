// ─────────────────────────────────────────────────────────────
//  Everything you might want to change lives in this one file.
//  Edit the text between the quotes, save, and push to GitHub.
// ─────────────────────────────────────────────────────────────

export const CONFIG = {
  name: 'Rajiea',
  nameAr: 'راجية',

  // The words that cycle after "Dentist ·" in the big title.
  taglines: [
    'smile-maker',
    'full of hope',
    'one of a kind',
    'gentle hands, sharp mind',
    'cavities’ worst nightmare',
  ],

  // What the 3D Rajiea says when you tap her.
  bubbleLines: [
    'Hi, I’m Rajiea 🦷',
    'Did you floss today? 👀',
    'Two minutes, twice a day.',
    'Spit, don’t rinse 💧',
    'A healthy smile is the best accessory ✨',
    'Gentle circles — your gums will thank you.',
    'Coffee first, then brushing ☕',
    'I can tell when you skip flossing 😌',
    'Smile — it suits you.',
  ],

  // ── Quiz: "How well do you know Rajiea?" ──
  // Every game picks `quizLength` random questions from this bank (never the
  // same set twice in a row) and shuffles the answers. `answer` must match one
  // of the options exactly. `hard: true` marks the tough ones (at least 3 per game).
  quizLength: 10,
  passMark: 7,
  quizBank: [
    // about her
    { q: 'What does Rajiea do for a living?', options: ['Pilot', 'Dentist', 'Chef', 'Architect'], answer: 'Dentist', why: 'Dr. Rajiea — professional smile-maker 🦷' },
    { q: 'Her Arabic name, راجية, comes from رجاء. What does it mean?', options: ['Moon', 'Rose', 'Hope', 'Brave'], answer: 'Hope', why: 'راجية means “full of hope”. Fitting, right?' },
    { q: 'What is Rajiea’s sworn enemy?', options: ['Cavities', 'Mondays', 'Spiders', 'Traffic'], answer: 'Cavities', why: 'Mondays come close, but cavities win.' },
    { q: 'What colour is her phone case?', options: ['Black', 'Clear', 'Red', 'Blue'], answer: 'Red', why: 'Red — you can spot it in every mirror selfie 📱' },
    { q: 'Which accessory has she worn since she was a baby?', options: ['Sunglasses', 'A gold bracelet', 'A watch', 'A hair clip'], answer: 'A gold bracelet', why: 'A gold bracelet — Little Rajiea had one too ✨' },
    { q: 'What does the badge on her white coat say?', options: ['Nurse Rajiea', 'Dr. Rajiea', 'Smile Boss', 'Rajiea & Co.'], answer: 'Dr. Rajiea', why: 'Check the 3D her in Clinic mode.' },
    { q: 'Which hijab colour does she wear in her City outfit?', options: ['Pink', 'Olive', 'Navy', 'White'], answer: 'Olive', why: 'Olive, with fringed ends — very chic.' },
    { q: 'What is Little Rajiea holding?', options: ['A toothbrush', 'A purple toy', 'A teddy bear', 'A balloon'], answer: 'A purple toy', why: 'A little purple toy — scroll to “Then & now”.' },
    { q: 'Which of these would Rajiea never tell you to do?', options: ['Floss daily', 'Brush as hard as you can', 'Use fluoride toothpaste', 'Get regular check-ups'], answer: 'Brush as hard as you can', why: 'Gentle circles. Scrubbing hard hurts gums and enamel.' },
    { q: 'Which drink would Rajiea warn you can stain your teeth?', options: ['Water', 'Coffee', 'Milk', 'Sparkling water'], answer: 'Coffee', why: 'Coffee and tea can stain — a quick rinse with water after helps.' },
    { q: 'What colour is Little Rajiea’s dress?', options: ['Pink with dots', 'Navy with white trim', 'Yellow', 'Green stripes'], answer: 'Navy with white trim', why: 'Navy on top, a white skirt and a navy band. A classic.', hard: true },
    { q: 'How many letters are in راجية (in Arabic)?', options: ['4', '5', '6', '7'], answer: '5', why: 'ر ا ج ي ة — five letters.', hard: true },

    // teeth trivia
    { q: 'How many teeth does a grown-up usually have?', options: ['24', '28', '30', '32'], answer: '32', why: '32, counting the four wisdom teeth.' },
    { q: 'How long would Rajiea tell you to brush for?', options: ['30 seconds', '1 minute', '2 minutes', '10 minutes'], answer: '2 minutes', why: 'Two full minutes, twice a day.' },
    { q: 'What is the hardest thing in the human body?', options: ['Bone', 'Tooth enamel', 'Nails', 'Hair'], answer: 'Tooth enamel', why: 'Enamel — harder than bone, but it can’t grow back.' },
    { q: 'How often should you swap your toothbrush for a new one?', options: ['Every week', 'Every 3 months', 'Every 2 years', 'Never'], answer: 'Every 3 months', why: 'Every 3 months, or sooner if the bristles look frayed.' },
    { q: 'How many baby teeth do children have?', options: ['16', '20', '24', '28'], answer: '20', why: '20 baby teeth, all replaced by adult ones.' },
    { q: 'Which teeth come in last, usually in your late teens or twenties?', options: ['Canines', 'Wisdom teeth', 'Incisors', 'Baby molars'], answer: 'Wisdom teeth', why: 'Wisdom teeth — some people never get them at all.' },
    { q: 'After brushing, what should you do?', options: ['Rinse well with water', 'Spit, don’t rinse', 'Drink juice', 'Brush again'], answer: 'Spit, don’t rinse', why: 'Leaving a little toothpaste keeps the fluoride working.' },
    { q: 'What is plaque mostly made of?', options: ['Sugar', 'Bacteria', 'Calcium', 'Food crumbs'], answer: 'Bacteria', why: 'A sticky film of bacteria. Brush it away.' },
    { q: 'Which teeth do you use to bite into an apple?', options: ['Molars', 'Incisors', 'Premolars', 'Wisdom teeth'], answer: 'Incisors', why: 'The flat front teeth — made for biting.' },
    { q: 'What do you call a dentist who straightens teeth with braces?', options: ['Orthodontist', 'Periodontist', 'Endodontist', 'Pediatrician'], answer: 'Orthodontist', why: 'Orthodontists — the braces specialists.' },
    { q: 'Which mineral in toothpaste helps make enamel stronger?', options: ['Iron', 'Fluoride', 'Zinc', 'Salt'], answer: 'Fluoride', why: 'Fluoride helps rebuild and protect enamel.' },
    { q: 'What is hardened plaque called?', options: ['Tartar', 'Enamel', 'Floss', 'Pulp'], answer: 'Tartar', why: 'Tartar — only a dentist can remove it.' },
    { q: 'The pointy “eye teeth” are properly called…', options: ['Incisors', 'Canines', 'Molars', 'Premolars'], answer: 'Canines', why: 'Canines — the pointy ones next to your front teeth.', hard: true },
    { q: 'What is the layer just under the enamel called?', options: ['Pulp', 'Dentin', 'Cementum', 'Plaque'], answer: 'Dentin', why: 'Dentin — yellowish, and more sensitive than enamel.', hard: true },
    { q: 'The soft centre of a tooth, with nerves and blood vessels, is the…', options: ['Crown', 'Pulp', 'Root', 'Enamel'], answer: 'Pulp', why: 'The pulp — that’s what a root canal treats.', hard: true },
    { q: 'What is the dental name for grinding your teeth?', options: ['Halitosis', 'Bruxism', 'Gingivitis', 'Caries'], answer: 'Bruxism', why: 'Bruxism — it often happens during sleep.', hard: true },
    { q: 'What is gingivitis?', options: ['A cavity', 'Gum inflammation', 'A broken tooth', 'Bad breath'], answer: 'Gum inflammation', why: 'Swollen, bleeding gums — usually reversed by better brushing and flossing.', hard: true },
    { q: 'What is the medical name for bad breath?', options: ['Halitosis', 'Bruxism', 'Plaque', 'Tartar'], answer: 'Halitosis', why: 'Halitosis. Brushing your tongue helps.', hard: true },
    { q: '“Dental caries” is another name for…', options: ['Braces', 'Cavities', 'Fillings', 'Crowns'], answer: 'Cavities', why: 'Caries = cavities = Rajiea’s arch-enemy.', hard: true },
    { q: 'How many roots does an upper first molar usually have?', options: ['1', '2', '3', '4'], answer: '3', why: 'Three — molars stand on their roots like a tripod.', hard: true },
  ],

  // One of these is picked at random when someone wins the quiz.
  prizes: [
    { icon: '☕', title: 'A coffee of your choice', note: 'Any size. Extra cream allowed.' },
    { icon: '💐', title: 'A bouquet of flowers', note: 'Pink ones, of course.' },
    { icon: '🍰', title: 'A dessert date', note: 'Dentist-approved… mostly.' },
    { icon: '✨', title: 'One wish, granted', note: 'Within reason.' },
  ],
  claimLine: 'Screenshot this to claim your prize 💌',

  // What Little Rajiea says when you tap her.
  babyLines: ['Hehe!', 'Again!', 'Look at my bracelet ✨', 'One day I’ll be a dentist 🦷', 'Peekaboo 👀'],

  // ── Smile School: myth or fact cards ──
  tips: [
    { claim: 'Brushing harder gets your teeth cleaner.', fact: false, why: 'Gentle circles with a soft brush clean best. Scrubbing hard can wear enamel and hurt your gums.' },
    { claim: 'You should brush for two minutes, twice a day.', fact: true, why: 'Morning and night, two full minutes — about 30 seconds for each part of your mouth.' },
    { claim: 'Rinse with water straight after brushing.', fact: false, why: 'Spit, don’t rinse. A little toothpaste left behind keeps the fluoride protecting your teeth.' },
    { claim: 'Tooth enamel is the hardest thing in your body.', fact: true, why: 'Harder than bone — but it can’t grow back, so look after it.' },
    { claim: 'Sugar-free drinks can’t harm your teeth.', fact: false, why: 'Many are acidic, and acid can soften enamel even with zero sugar.' },
    { claim: 'Swap your toothbrush every 3 months.', fact: true, why: 'Or sooner if the bristles look frayed. Tired bristles don’t clean well.' },
    { claim: 'If you brush well, you can skip flossing.', fact: false, why: 'A brush can’t reach between teeth. Floss gets the spots where cavities like to hide.' },
    { claim: 'Grown-ups usually have 32 teeth.', fact: true, why: 'Counting the four wisdom teeth. Children have 20 baby teeth.' },
  ],

  // ── The letter in the envelope at the bottom of the page ──
  note: {
    greeting: 'Dear Rajiea,',
    body: [
      'This little corner of the internet is all yours.',
      'Thank you for every smile you fix — and every smile you cause.',
      'Keep shining. The world needs more people like you. ✨',
    ],
    signoff: 'With love 💌',
  },
};
