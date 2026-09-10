// ---- Telegram setup ----
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();
  tg.expand();
}
const currentUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user
  ? (tg.initDataUnsafe.user.first_name || tg.initDataUnsafe.user.username || 'Family member')
  : 'Guest';
document.getElementById('userTag').textContent = currentUser;

// ---- Supabase setup ----
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let accounts = [];
let categories = { income: [], expense: [] };
let transactions = [];
let currentType = 'expense';

function fmt(n) {
  const v = Number(n) || 0;
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

// ---- Data loading ----
async function loadAll() {
  const [accRes, catRes, txnRes] = await Promise.all([
    supabase.from('accounts').select('*').order('sort_order'),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('transactions').select('*').order('date', { ascending: false }).order('id', { ascending: false }).limit(200)
  ]);

  if (accRes.error || catRes.error || txnRes.error) {
    showToast("Couldn't load data — check config.js");
    console.error(accRes.error || catRes.error || txnRes.error);
    return;
  }

  accounts = accRes.data;
  categories.income = catRes.data.filter(c => c.type === 'income').map(c => c.name);
  categories.expense = catRes.data.filter(c => c.type === 'expense').map(c => c.name);
  transactions = txnRes.data;

  render();
}

async function addTransaction(t) {
  const { error } = await supabase.from('transactions').insert({
    date: t.date,
    type: t.type,
    amount: t.amount,
    account_id: t.accountId,
    category: t.category,
    note: t.note || null,
    added_by: currentUser
  });
  if (error) {
    console.error(error);
    showToast("Couldn't save — try again");
    return false;
  }
  return true;
}

async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) {
    console.error(error);
    showToast("Couldn't delete — try again");
    return false;
  }
  return true;
}

// ---- Derived numbers ----
function monthKey(dateStr) { return dateStr.slice(0, 7); }

function computeBalance() {
  let bal = 0;
  transactions.forEach(t => { bal += t.type === 'income' ? Number(t.amount) : -Number(t.amount); });
  return bal;
}

function computeMonthTotals() {
  const mk = new Date().toISOString().slice(0, 7);
  let inc = 0, out = 0;
  transactions.forEach(t => {
    if (monthKey(t.date) === mk) {
      if (t.type === 'income') inc += Number(t.amount); else out += Number(t.amount);
    }
  });
  return { inc, out, net: inc - out };
}

function computeCategorySpend() {
  const mk = new Date().toISOString().slice(0, 7);
  const map = {};
  transactions.forEach(t => {
    if (t.type === 'expense' && monthKey(t.date) === mk) {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    }
  });
  return map;
}

// ---- Rendering ----
function populateSelects() {
  const accSel = document.getElementById('fAccount');
  accSel.innerHTML = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  renderCategoryOptions();
}

function renderCategoryOptions() {
  const catSel = document.getElementById('fCategory');
  const list = currentType === 'income' ? categories.income : categories.expense;
  catSel.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join('');
}

function render() {
  document.getElementById('balanceAmt').textContent = fmt(computeBalance());
  const m = computeMonthTotals();
  document.getElementById('monthIn').textContent = fmt(m.inc);
  document.getElementById('monthOut').textContent = fmt(m.out);
  const netEl = document.getElementById('monthNet');
  netEl.textContent = fmt(m.net);
  netEl.className = 'v ' + (m.net >= 0 ? 'in' : 'out');
  document.getElementById('monthLabel').textContent = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  renderCategoryList();
  renderHistory();
  populateSelects();
}

function renderCategoryList() {
  const spend = computeCategorySpend();
  const entries = Object.entries(spend).sort((a, b) => b[1] - a[1]);
  const el = document.getElementById('catList');
  if (entries.length === 0) {
    el.innerHTML = '<div class="empty">No expenses logged this month yet.<br>Tap Add to log your first one.</div>';
    return;
  }
  const max = entries[0][1];
  el.innerHTML = entries.map(([cat, amt]) => `
    <div class="cat-row">
      <div class="info">
        <div class="cname">${cat}</div>
        <div class="bar-bg"><div class="bar-fill" style="width:${Math.max(4, amt / max * 100)}%"></div></div>
      </div>
      <div class="camt">${fmt(amt)}</div>
    </div>
  `).join('');
}

function renderHistory() {
  const el = document.getElementById('txnList');
  if (transactions.length === 0) {
    el.innerHTML = '<div class="empty">No transactions yet.<br>Tap Add to log your first one.</div>';
    return;
  }
  el.innerHTML = transactions.slice(0, 50).map(t => {
    const acc = accounts.find(a => a.id === t.account_id);
    const icon = t.type === 'income' ? '↑' : '↓';
    const who = t.added_by ? ' · ' + t.added_by : '';
    return `
    <div class="txn-row">
      <div class="txn-icon ${t.type === 'income' ? 'in' : 'out'}">${icon}</div>
      <div class="txn-mid">
        <div class="txn-cat">${t.category}</div>
        <div class="txn-sub">${t.date} · ${acc ? acc.name : ''}${t.note ? ' · ' + t.note : ''}${who}</div>
      </div>
      <div class="txn-amt ${t.type === 'income' ? 'v in' : 'v out'}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</div>
      <div class="txn-del" data-id="${t.id}">&times;</div>
    </div>`;
  }).join('');

  el.querySelectorAll('.txn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const ok = await deleteTransaction(id);
      if (ok) {
        transactions = transactions.filter(t => t.id !== id);
        render();
        showToast('Transaction deleted');
      }
    });
  });
}

// ---- Tabs ----
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('tab-overview').style.display = tab === 'overview' ? 'block' : 'none';
  document.getElementById('tab-add').style.display = tab === 'add' ? 'block' : 'none';
  document.getElementById('tab-history').style.display = tab === 'history' ? 'block' : 'none';
  document.getElementById('mainbtnWrap').style.display = tab === 'add' ? 'block' : 'none';
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => switchTab(t.dataset.tab));
});

document.getElementById('toggleOut').addEventListener('click', () => {
  currentType = 'expense';
  document.getElementById('toggleOut').className = 'sel-out';
  document.getElementById('toggleIn').className = '';
  renderCategoryOptions();
});
document.getElementById('toggleIn').addEventListener('click', () => {
  currentType = 'income';
  document.getElementById('toggleIn').className = 'sel-in';
  document.getElementById('toggleOut').className = '';
  renderCategoryOptions();
});

document.getElementById('mainBtn').addEventListener('click', async () => {
  const amtField = document.getElementById('fAmount');
  const amt = parseFloat(amtField.value);
  const errEl = document.getElementById('formErr');
  if (!amt || amt <= 0) {
    errEl.style.display = 'block';
    amtField.style.borderColor = '#E5493F';
    return;
  }
  errEl.style.display = 'none';
  amtField.style.borderColor = '#E4E4E7';

  const t = {
    type: currentType,
    amount: amt,
    accountId: document.getElementById('fAccount').value,
    category: document.getElementById('fCategory').value,
    note: document.getElementById('fNote').value.trim(),
    date: new Date().toISOString().slice(0, 10)
  };

  const ok = await addTransaction(t);
  if (!ok) return;

  amtField.value = '';
  document.getElementById('fNote').value = '';
  await loadAll();
  switchTab('history');
  showToast('Transaction added');
});

loadAll();
