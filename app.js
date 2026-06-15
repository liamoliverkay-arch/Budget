/* =====================================================
   BudgetWise — app.js
   ===================================================== */

let currentSection = 1;
let housingType = 'rent';

// ── Navigation ──────────────────────────────────────
function goTo(n) {
  document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${n}`).classList.add('active');

  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < n) s.classList.add('done');
    if (i + 1 === n) s.classList.add('active');
  });

  currentSection = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Housing Toggle ───────────────────────────────────
function selectHousing(type, btn) {
  housingType = type;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.housing-fields').forEach(f => f.classList.add('hidden'));
  const el = document.getElementById(`fields-${type}`);
  if (el) el.classList.remove('hidden');

  updateSummary();
}

// ── Federal Tax Brackets 2024 ─────────────────────────
function federalTax(income, status) {
  // Brackets: [rate, threshold]
  const brackets = {
    single: [
      [0.10,  11600],
      [0.12,  47150],
      [0.22,  100525],
      [0.24,  191950],
      [0.32,  243725],
      [0.35,  609350],
      [0.37,  Infinity],
    ],
    married_joint: [
      [0.10,  23200],
      [0.12,  94300],
      [0.22,  201050],
      [0.24,  383900],
      [0.32,  487450],
      [0.35,  731200],
      [0.37,  Infinity],
    ],
    married_sep: [
      [0.10,  11600],
      [0.12,  47150],
      [0.22,  100525],
      [0.24,  191950],
      [0.32,  243725],
      [0.35,  365600],
      [0.37,  Infinity],
    ],
    head: [
      [0.10,  16550],
      [0.12,  63100],
      [0.22,  100500],
      [0.24,  191950],
      [0.32,  243700],
      [0.35,  609350],
      [0.37,  Infinity],
    ],
  };

  const b = brackets[status] || brackets.single;
  let tax = 0;
  let prev = 0;

  for (let i = 0; i < b.length; i++) {
    const [rate, cap] = b[i];
    const taxable = Math.max(0, Math.min(income, cap) - prev);
    tax += taxable * rate;
    prev = cap;
    if (income <= cap) break;
  }
  return tax;
}

// ── Standard Deduction ───────────────────────────────
function stdDeduction(status) {
  const d = { single: 14600, married_joint: 29200, married_sep: 14600, head: 21900 };
  return d[status] || 14600;
}

// ── Tax Calculator ────────────────────────────────────
function calcTax() {
  const gross = parseFloat(document.getElementById('gross-income').value) || 0;
  const other = parseFloat(document.getElementById('other-income').value) || 0;
  const total = gross + other;
  const status = document.getElementById('filing-status').value;
  const deduction = stdDeduction(status);
  const taxable = Math.max(0, total - deduction);

  const federal = federalTax(taxable, status);
  const ss = Math.min(total, 168600) * 0.062;  // SS wage base 2024
  const medicare = total * 0.0145;
  const state = total * 0.05; // ~5% flat estimate
  const totalTax = federal + ss + medicare + state;
  const takeHome = total - totalTax;

  document.getElementById('t-gross').textContent    = fmt(total);
  document.getElementById('t-federal').textContent  = '–' + fmt(federal);
  document.getElementById('t-ss').textContent       = '–' + fmt(ss);
  document.getElementById('t-medicare').textContent = '–' + fmt(medicare);
  document.getElementById('t-state').textContent    = '–' + fmt(state);
  document.getElementById('t-annual').textContent   = fmt(takeHome);
  document.getElementById('t-monthly').textContent  = fmt(takeHome / 12);
  document.getElementById('t-biweekly').textContent = fmt(takeHome / 26);

  window._taxData = { gross: total, federal, ss, medicare, state, takeHome };
  updateSummary();
}

// ── Housing Cost ─────────────────────────────────────
function getHousingCostMonthly() {
  let total = 0;
  switch (housingType) {
    case 'rent':
      total += val('rent-amount') + val('rent-insurance') + val('rent-util');
      break;
    case 'mortgage':
      total += val('mortgage-payment') + val('property-tax') / 12
             + val('home-insurance') / 12 + val('hoa') + val('mortgage-util');
      break;
    case 'own':
      total += val('own-property-tax') / 12 + val('own-insurance') / 12 + val('own-util');
      break;
    case 'other':
      total += val('other-housing');
      break;
  }
  return total;
}

// ── Total Expenses ────────────────────────────────────
function getTotalExpenses() {
  let sum = 0;
  document.querySelectorAll('.expense').forEach(el => {
    sum += parseFloat(el.value) || 0;
  });
  return sum;
}

// ── Savings from Expense Section ─────────────────────
function getSavings() {
  return val2('emergency') + val2('retirement') + val2('other_savings');
}

function val2(key) {
  const el = document.querySelector(`[data-key="${key}"]`);
  return el ? (parseFloat(el.value) || 0) : 0;
}

// ── Summary Builder ───────────────────────────────────
function updateSummary() {
  // called live, just keeps _summaryData fresh for when we navigate to step 6
}

function buildSummary() {
  const tax = window._taxData || {};
  const monthly = (tax.takeHome || 0) / 12;
  const housing = getHousingCostMonthly();
  const otherExp = getTotalExpenses();
  const totalExp = housing + otherExp;
  const leftover = monthly - totalExp;
  const savings = getSavings();
  const savingsRate = monthly > 0 ? (savings / monthly * 100) : 0;
  const debtPayments = val2('student_loans') + val2('credit_cards') + val2('other_debt');
  const dti = monthly > 0 ? (debtPayments / monthly * 100) : 0;
  const housingRatio = monthly > 0 ? (housing / monthly * 100) : 0;

  // ── Health Score ─────────────────────────────────
  let score = 50;
  if (savingsRate >= 20) score += 20;
  else if (savingsRate >= 10) score += 10;
  else if (savingsRate < 5) score -= 10;
  if (dti < 20) score += 15;
  else if (dti > 40) score -= 15;
  if (housingRatio < 30) score += 10;
  else if (housingRatio > 40) score -= 10;
  if (leftover > 0) score += 5;
  else score -= 20;
  score = Math.max(0, Math.min(100, score));

  const arc = document.getElementById('score-arc');
  const circumference = 314;
  arc.style.strokeDashoffset = circumference - (circumference * score / 100);
  arc.style.stroke = score >= 70 ? '#4CAF80' : score >= 45 ? '#F7C948' : '#E05C5C';
  document.getElementById('score-num').textContent = score;

  const scoreColor = score >= 70 ? 'green' : score >= 45 ? 'amber' : 'red';

  // ── Summary Cards ─────────────────────────────────
  const grid = document.getElementById('summary-grid');
  grid.innerHTML = '';

  const cards = [
    { label: 'Annual Take-Home', value: fmt(tax.takeHome || 0), sub: 'After estimated taxes', color: 'green' },
    { label: 'Monthly Take-Home', value: fmt(monthly), sub: 'After taxes ÷ 12', color: 'green' },
    { label: 'Monthly Expenses', value: fmt(totalExp), sub: 'Housing + all costs', color: totalExp > monthly ? 'red' : 'blue' },
    { label: 'Monthly Leftover', value: fmt(leftover), sub: leftover >= 0 ? 'Positive — great!' : 'Deficit — needs attention', color: leftover >= 0 ? 'green' : 'red' },
    { label: 'Savings Rate', value: savingsRate.toFixed(1) + '%', sub: '20%+ is excellent', color: savingsRate >= 20 ? 'green' : savingsRate >= 10 ? 'amber' : 'red' },
    { label: 'Debt-to-Income', value: dti.toFixed(1) + '%', sub: 'Under 36% is healthy', color: dti < 36 ? 'green' : 'red' },
    { label: 'Housing Ratio', value: housingRatio.toFixed(1) + '%', sub: 'Under 30% is ideal', color: housingRatio < 30 ? 'green' : housingRatio < 40 ? 'amber' : 'red' },
    { label: 'Annual Tax Burden', value: fmt((tax.federal||0)+(tax.ss||0)+(tax.medicare||0)+(tax.state||0)), sub: 'Est. federal + state + FICA', color: 'blue' },
  ];

  cards.forEach(c => {
    const d = document.createElement('div');
    d.className = `summary-card ${c.color}`;
    d.innerHTML = `<div class="s-label">${c.label}</div><div class="s-value">${c.value}</div><div class="s-sub">${c.sub}</div>`;
    grid.appendChild(d);
  });

  // ── Budget Bar ─────────────────────────────────────
  const segments = [
    { label: 'Housing', value: housing, color: '#2D6A9F' },
    { label: 'Transport', value: val2('car_payment')+val2('car_insurance')+val2('gas')+val2('transit'), color: '#3D82BE' },
    { label: 'Food', value: val2('groceries')+val2('dining'), color: '#4CAF80' },
    { label: 'Bills', value: val2('phone')+val2('internet')+val2('streaming')+val2('subscriptions'), color: '#6FCF97' },
    { label: 'Health', value: val2('health_ins')+val2('gym')+val2('medical'), color: '#F7C948' },
    { label: 'Debt', value: debtPayments, color: '#E05C5C' },
    { label: 'Lifestyle', value: val2('entertainment')+val2('shopping')+val2('personal_care')+val2('gifts'), color: '#E8845C' },
    { label: 'Savings', value: savings, color: '#1B6F4C' },
  ].filter(s => s.value > 0);

  const barTotal = segments.reduce((a, b) => a + b.value, 0) || 1;
  const bar = document.getElementById('budget-bar');
  const leg = document.getElementById('budget-legend');
  bar.innerHTML = '';
  leg.innerHTML = '';

  segments.forEach(s => {
    const pct = (s.value / barTotal * 100).toFixed(1);
    const seg = document.createElement('div');
    seg.className = 'bar-seg';
    seg.style.width = pct + '%';
    seg.style.background = s.color;
    seg.title = `${s.label}: ${fmt(s.value)} (${pct}%)`;
    bar.appendChild(seg);

    const li = document.createElement('div');
    li.className = 'legend-item';
    li.innerHTML = `<div class="legend-dot" style="background:${s.color}"></div><span>${s.label} ${fmt(s.value)}</span>`;
    leg.appendChild(li);
  });

  // ── Insights ───────────────────────────────────────
  const insights = [];

  if (leftover < 0) {
    insights.push({ icon: '🚨', text: `You're spending <strong>${fmt(Math.abs(leftover))}/mo more</strong> than you take home. Prioritize cutting the largest discretionary expenses immediately.` });
  } else if (leftover > 0) {
    insights.push({ icon: '✅', text: `You have <strong>${fmt(leftover)}/mo</strong> unallocated. Consider directing this toward savings or debt payoff.` });
  }

  if (savingsRate < 10) {
    insights.push({ icon: '💡', text: `Your savings rate is <strong>${savingsRate.toFixed(1)}%</strong>. Aim for at least 20%. Even increasing by 1% per month can make a huge long-term difference.` });
  } else if (savingsRate >= 20) {
    insights.push({ icon: '🌟', text: `Outstanding savings rate of <strong>${savingsRate.toFixed(1)}%</strong>! You're on a strong track toward financial independence.` });
  }

  if (dti > 36) {
    insights.push({ icon: '⚠️', text: `Your debt-to-income ratio is <strong>${dti.toFixed(1)}%</strong> — above the 36% threshold lenders prefer. Focus on eliminating high-interest debt first.` });
  }

  if (housingRatio > 30) {
    insights.push({ icon: '🏠', text: `Housing takes up <strong>${housingRatio.toFixed(1)}%</strong> of take-home pay (recommended: under 30%). If possible, consider ways to reduce this cost.` });
  }

  const emergTarget = parseFloat(document.getElementById('emergency-target').value) || 0;
  const emergSaving = val2('emergency');
  if (emergTarget > 0 && emergSaving > 0) {
    const months = Math.ceil(emergTarget / emergSaving);
    insights.push({ icon: '🛡️', text: `At ${fmt(emergSaving)}/mo, you'll reach your emergency fund goal in <strong>~${months} months</strong>.` });
  } else if (!emergSaving) {
    insights.push({ icon: '🛡️', text: `No emergency fund savings detected. Aim for 3–6 months of expenses (${fmt(totalExp * 3)}–${fmt(totalExp * 6)}) as a financial safety net.` });
  }

  const retireSaving = val2('retirement');
  if (!retireSaving) {
    insights.push({ icon: '📈', text: `You haven't allocated funds to retirement. Even <strong>${fmt(monthly * 0.05)}/mo (5%)</strong> invested early compounds dramatically over time.` });
  }

  if (insights.length === 0) {
    insights.push({ icon: '👍', text: 'Your budget looks solid! Continue monitoring monthly and adjust as life changes.' });
  }

  const iList = document.getElementById('insights-list');
  iList.innerHTML = insights.map(i =>
    `<div class="insight-item"><span class="insight-icon">${i.icon}</span><span>${i.text}</span></div>`
  ).join('');

  // ── Goals Section ──────────────────────────────────
  const name = document.getElementById('name').value || 'You';
  const bio = document.getElementById('bio').value;
  const shortGoals = document.getElementById('short-goals').value;
  const longGoals = document.getElementById('long-goals').value;
  const retireAge = document.getElementById('retire-age').value;
  const retireSavings = document.getElementById('retire-savings').value;
  const bigPurchase = document.getElementById('big-purchase').value;
  const age = document.getElementById('age').value;

  const gs = document.getElementById('goals-summary');
  let goalsHtml = `<h3>🗺️ ${name}'s Financial Roadmap</h3>`;

  if (bio) goalsHtml += `<div class="goal-item"><strong>About:</strong> ${escHtml(bio)}</div>`;
  if (shortGoals) goalsHtml += `<div class="goal-item"><strong>Short-term goals:</strong> ${escHtml(shortGoals)}</div>`;
  if (longGoals) goalsHtml += `<div class="goal-item"><strong>Long-term goals:</strong> ${escHtml(longGoals)}</div>`;

  if (retireAge && retireSavings && age) {
    const yearsLeft = retireAge - age;
    const needMonthly = yearsLeft > 0
      ? Math.ceil((parseFloat(retireSavings) - (retireSaving * 12 * yearsLeft)) / (yearsLeft * 12))
      : 0;
    goalsHtml += `<div class="goal-item"><strong>Retirement:</strong> Target ${fmt(parseFloat(retireSavings)||0)} by age ${retireAge} — that's ${yearsLeft} years away. You're saving ${fmt(retireSaving)}/mo toward retirement now.</div>`;
  }

  if (bigPurchase) {
    const bpAmt = parseFloat(bigPurchase) || 0;
    const bpSaving = val2('other_savings');
    const bpMonths = bpSaving > 0 ? Math.ceil(bpAmt / bpSaving) : '?';
    goalsHtml += `<div class="goal-item"><strong>Major purchase goal:</strong> ${fmt(bpAmt)} — at ${fmt(bpSaving)}/mo saved, reached in ~${bpMonths} months.</div>`;
  }

  gs.innerHTML = goalsHtml;
}

// ── Helpers ───────────────────────────────────────────
function fmt(n) {
  if (isNaN(n) || n === null) return '$—';
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function val(id) {
  return parseFloat(document.getElementById(id)?.value) || 0;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function resetAll_REPLACED() {
  if (!confirm('Start over? All your data will be cleared.')) return;
  document.querySelectorAll('input, textarea').forEach(el => { el.value = el.type === 'number' ? (el.placeholder === '0' ? '0' : '') : ''; });
  document.querySelectorAll('select').forEach(el => { el.selectedIndex = 0; });
  selectHousing('rent', document.querySelector('[data-value="rent"]'));
  window._taxData = null;
  goTo(1);
}

// ── Randomize Engine ──────────────────────────────────
const FIRST_NAMES = ['Jordan','Casey','Morgan','Taylor','Riley','Alex','Jamie','Drew','Avery','Blake',
  'Cameron','Dakota','Emery','Finley','Hayden','Jesse','Kendall','Logan','Marlowe','Peyton',
  'Quinn','Reese','Sage','Skyler','Tatum','River','Phoenix','Rowan','Ellis','Sloane'];
const LAST_NAMES  = ['Mitchell','Rivera','Chen','Patel','Williams','Johnson','Kim','Garcia',
  'Thompson','Anderson','Martinez','Lewis','Walker','Hall','Young','Allen','Scott','Harris',
  'Clark','Robinson','Wright','Torres','Nguyen','Hill','Moore','Jackson','White','Lee','Perez','Martin'];
const CITIES = [
  'Nashville, TN','Austin, TX','Denver, CO','Phoenix, AZ','Charlotte, NC',
  'Columbus, OH','Indianapolis, IN','Jacksonville, FL','Memphis, TN','Louisville, KY',
  'Portland, OR','Las Vegas, NV','Milwaukee, WI','Albuquerque, NM','Tucson, AZ',
  'Fresno, CA','Sacramento, CA','Kansas City, MO','Mesa, AZ','Atlanta, GA',
  'Seattle, WA','Boston, MA','Chicago, IL','Miami, FL','Dallas, TX',
  'San Diego, CA','Minneapolis, MN','Tampa, FL','New Orleans, LA','Raleigh, NC'
];
const JOBS = [
  ['Software Engineer','a mid-size tech startup','I build web apps and love working remotely.'],
  ['Registered Nurse','a regional hospital','Shift work keeps me busy but the work is meaningful.'],
  ['Marketing Coordinator','a local agency','Managing campaigns and client social media.'],
  ['High School Teacher','a public school district','I teach history and coach the debate team.'],
  ['Electrician','my own small contracting business','Mostly residential work. Steady income, long hours.'],
  ['Graphic Designer','a creative studio','Freelancing on the side keeps my skills sharp.'],
  ['Physical Therapist','a sports rehab clinic','Helping athletes recover is incredibly rewarding.'],
  ['Accountant','a regional CPA firm','Ironically, I\'m still figuring out my own finances.'],
  ['Dental Hygienist','a family dental practice','Four days a week, which I love.'],
  ['Warehouse Supervisor','a logistics company','Managing a team of 12 and working on my MBA.'],
  ['UX Designer','a fintech company','I design the apps people use to track money — so I should be better at this.'],
  ['Paramedic','the city fire department','High stress, but the team is like family.'],
  ['Real Estate Agent','my own brokerage','Commission-based income makes budgeting tricky.'],
  ['Chef','a downtown restaurant','Long nights, but I love what I do.'],
  ['Pharmacist','a chain pharmacy','Student loans are still brutal even years later.'],
];
const SHORT_GOAL_TEMPLATES = [
  'Pay off my credit card debt, build a 3-month emergency fund, and stop relying on credit for unexpected expenses.',
  'Save enough for a used car in cash. No more car payments after this one.',
  'Build a $10,000 emergency fund and finally start contributing to a Roth IRA.',
  'Get my monthly expenses under control, cut subscriptions I never use, and save for a vacation.',
  'Pay down student loans aggressively and get my debt-to-income ratio under 20%.',
  'Stop eating out every night. Budget for groceries and cook at home more than 4x a week.',
  'Save $5,000 as a buffer and get a raise at work.',
  'Consolidate my credit card debt and create a real monthly spending plan I actually follow.',
];
const LONG_GOAL_TEMPLATES = [
  'Buy a house in the next 3-4 years. Pay off all student debt before 35. Consider going freelance.',
  'Retire by 60 with at least $1.2M saved. Max out 401k every year starting now.',
  'Start a small business on the side within 2 years. Build passive income streams.',
  'Own property outright by 50. Travel internationally at least once a year. No debt by 45.',
  'Pay off the mortgage early, put kids through college without loans, retire comfortably at 62.',
  'Build a 6-month emergency fund, then invest aggressively until I can semi-retire at 55.',
  'Move to a lower cost-of-living city, buy land, and eventually build a custom home.',
  'Achieve financial independence by 45. Spend the second half of my career doing work I choose.',
];

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function roundTo(n, step) { return Math.round(n / step) * step; }

function randomizePerson() {
  const firstName = pick(FIRST_NAMES);
  const lastName  = pick(LAST_NAMES);
  const age       = rnd(22, 58);
  const city      = pick(CITIES);
  const [jobTitle, employer, jobQuote] = pick(JOBS);
  const filingOptions = age > 35 ? ['single','married_joint','head'] : ['single','single','married_joint'];
  const filing    = pick(filingOptions);
  const dependents = filing === 'single' ? 0 : rnd(0, 3);

  // Income: $30k-$500k, weighted toward middle
  const incomeRanges = [
    [30000, 55000],
    [55000, 95000],
    [95000, 160000],
    [160000, 500000],
  ];
  const weights = [0.25, 0.40, 0.25, 0.10];
  let incomeRoll = Math.random(), cumulative = 0, range = incomeRanges[0];
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (incomeRoll <= cumulative) { range = incomeRanges[i]; break; }
  }
  const grossIncome = roundTo(rnd(range[0], range[1]), 500);
  const hasOtherIncome = Math.random() > 0.55;
  const otherIncome  = hasOtherIncome ? roundTo(rnd(500, 12000), 250) : 0;
  const monthlyNet   = grossIncome * 0.72 / 12;

  // Housing
  const housingTypes = grossIncome < 55000
    ? ['rent','rent','other']
    : grossIncome > 150000
    ? ['mortgage','mortgage','rent']
    : ['rent','rent','mortgage'];
  const hType = pick(housingTypes);
  const housingBudget = monthlyNet * (Math.random() * 0.12 + 0.25);

  const bio = jobTitle + ' at ' + employer + '. ' + jobQuote + ' I\'m ' + age + ' years old, based in ' + city + ', and trying to get a real handle on my finances.';

  setVal('name', firstName + ' ' + lastName);
  setVal('age', age);
  setVal('location', city);
  document.getElementById('filing-status').value = filing;
  setVal('dependents', dependents);
  setVal('bio', bio);
  setVal('gross-income', grossIncome);
  setVal('other-income', otherIncome);

  const housingBtn = document.querySelector('[data-value="' + hType + '"]');
  selectHousing(hType, housingBtn);

  if (hType === 'rent') {
    setVal('rent-amount',    roundTo(housingBudget * 0.78, 25));
    setVal('rent-insurance', roundTo(rnd(12, 30), 1));
    setVal('rent-util',      roundTo(rnd(80, 220), 10));
  } else if (hType === 'mortgage') {
    setVal('mortgage-payment', roundTo(housingBudget * 0.72, 50));
    setVal('home-value',       roundTo(grossIncome * rnd(3, 7), 5000));
    setVal('property-tax',     roundTo(grossIncome * 0.04, 100));
    setVal('home-insurance',   roundTo(rnd(900, 2400), 100));
    setVal('hoa',              Math.random() > 0.6 ? roundTo(rnd(100, 450), 25) : 0);
    setVal('mortgage-util',    roundTo(rnd(120, 300), 10));
  } else if (hType === 'own') {
    setVal('own-property-tax', roundTo(grossIncome * 0.025, 100));
    setVal('own-insurance',    roundTo(rnd(800, 1800), 100));
    setVal('own-util',         roundTo(rnd(100, 280), 10));
  } else {
    setVal('other-housing', roundTo(rnd(0, 600), 50));
  }

  const hasCar   = Math.random() > 0.25;
  const hasLoans = Math.random() > 0.40;
  const hasCC    = Math.random() > 0.35;

  setExpense('car_payment',   hasCar ? roundTo(rnd(150, 650), 25) : 0);
  setExpense('car_insurance', hasCar ? roundTo(rnd(70, 220), 5)   : 0);
  setExpense('gas',           hasCar ? roundTo(rnd(40, 180), 5)   : 0);
  setExpense('transit',       !hasCar ? roundTo(rnd(30, 130), 10) : 0);
  setExpense('groceries',     roundTo(rnd(200, 600), 10));
  setExpense('dining',        roundTo(rnd(50, 400), 10));
  setExpense('phone',         roundTo(rnd(40, 120), 5));
  setExpense('internet',      roundTo(rnd(40, 90), 5));
  setExpense('streaming',     roundTo(rnd(15, 65), 5));
  setExpense('subscriptions', roundTo(rnd(0, 60), 5));
  setExpense('health_ins',    roundTo(rnd(80, 450), 10));
  setExpense('gym',           Math.random() > 0.4 ? roundTo(rnd(20, 120), 5) : 0);
  setExpense('medical',       roundTo(rnd(0, 120), 10));
  setExpense('student_loans', hasLoans ? roundTo(rnd(150, 800), 25) : 0);
  setExpense('credit_cards',  hasCC    ? roundTo(rnd(50, 350), 25)  : 0);
  setExpense('other_debt',    Math.random() > 0.7 ? roundTo(rnd(50, 300), 25) : 0);
  setExpense('entertainment', roundTo(rnd(30, 250), 10));
  setExpense('shopping',      roundTo(rnd(30, 300), 10));
  setExpense('personal_care', roundTo(rnd(20, 100), 5));
  setExpense('gifts',         roundTo(rnd(0, 150), 10));

  const savingsPct = grossIncome > 120000 ? rnd(10, 25) : grossIncome > 70000 ? rnd(3, 18) : rnd(0, 10);
  const m = monthlyNet;
  setExpense('emergency',     roundTo(m * savingsPct / 100 * 0.4, 25));
  setExpense('retirement',    roundTo(m * savingsPct / 100 * 0.45, 25));
  setExpense('other_savings', roundTo(m * savingsPct / 100 * 0.15, 25));

  setVal('short-goals',      pick(SHORT_GOAL_TEMPLATES));
  setVal('long-goals',       pick(LONG_GOAL_TEMPLATES));
  setVal('emergency-target', roundTo(monthlyNet * rnd(3, 6), 500));
  setVal('big-purchase',     Math.random() > 0.4 ? roundTo(rnd(15000, 120000), 5000) : 0);
  setVal('retire-age',       rnd(58, 68));
  setVal('retire-savings',   roundTo(rnd(500000, 3000000), 50000));

  calcTax();

  const incLabel = grossIncome >= 1000 ? '$' + Math.round(grossIncome/1000) + 'k' : '$' + grossIncome;
  showToast('🎲 Generated: ' + firstName + ' ' + lastName + ' — ' + jobTitle + ' earning ' + incLabel + '/yr');
}

function showToast(msg) {
  let t = document.getElementById('randomize-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'randomize-toast';
    t.className = 'randomize-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3500);
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v;
}

function setExpense(key, v) {
  const el = document.querySelector('[data-key="' + key + '"]');
  if (el) el.value = v;
}

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.step').forEach(function(s, i) {
    s.style.cursor = 'pointer';
    s.addEventListener('click', function() { goTo(i + 1); });
  });
  document.getElementById('filing-status').addEventListener('change', calcTax);
  // Start with a random person on load
  randomizePerson();
});

function resetAll() {
  if (!confirm('Generate a new random person?')) return;
  window._taxData = null;
  randomizePerson();
  goTo(1);
}
