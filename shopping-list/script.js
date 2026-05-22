const STORAGE_KEY = 'shopping-list-items';

let items = load();
let activeFilter = 'all';

const form        = document.getElementById('add-form');
const nameInput   = document.getElementById('item-name');
const qtyInput    = document.getElementById('item-qty');
const priceInput  = document.getElementById('item-price');
const catInput    = document.getElementById('item-category');
const formError   = document.getElementById('form-error');
const filterTabs  = document.getElementById('filter-tabs');
const showDone    = document.getElementById('show-completed');
const clearDone   = document.getElementById('clear-done');
const emptyState  = document.getElementById('empty-state');

const lists   = { food: document.getElementById('list-food'),    medical: document.getElementById('list-medical'),    others: document.getElementById('list-others') };
const groups  = { food: document.getElementById('group-food'),   medical: document.getElementById('group-medical'),   others: document.getElementById('group-others') };
const counts  = { food: document.getElementById('count-food'),   medical: document.getElementById('count-medical'),   others: document.getElementById('count-others') };

const summaryTotal = document.getElementById('summary-total');
const summaryDone  = document.getElementById('summary-done');
const summaryPrice = document.getElementById('summary-price');

// ── Persistence ──────────────────────────────────────────────
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

// ── Render ────────────────────────────────────────────────────
function render() {
  const showCompleted = showDone.checked;
  const cats = ['food', 'medical', 'others'];

  cats.forEach(cat => lists[cat].innerHTML = '');

  const visible = items.filter(item => {
    if (activeFilter !== 'all' && item.category !== activeFilter) return false;
    if (!showCompleted && item.done) return false;
    return true;
  });

  visible.forEach(item => {
    const li = buildItemEl(item);
    lists[item.category].appendChild(li);
  });

  cats.forEach(cat => {
    const catItems = visible.filter(i => i.category === cat);
    const total    = items.filter(i => i.category === cat);
    const doneCnt  = total.filter(i => i.done).length;

    const show = (activeFilter === 'all' || activeFilter === cat) && catItems.length > 0;
    groups[cat].hidden = !show;
    counts[cat].textContent = `${doneCnt}/${total.length} done`;
  });

  const anyVisible = visible.length > 0;
  emptyState.hidden = anyVisible;

  updateSummary();
  save();
}

function buildItemEl(item) {
  const li = document.createElement('li');
  li.className = `item${item.done ? ' done' : ''}`;
  li.dataset.id = item.id;

  const priceText = item.price != null ? `$${Number(item.price).toFixed(2)}` : '';

  li.innerHTML = `
    <input type="checkbox" class="item-check" ${item.done ? 'checked' : ''}
           aria-label="Mark ${escHtml(item.name)} as ${item.done ? 'incomplete' : 'complete'}" />
    <div class="item-body">
      <div class="item-name">${escHtml(item.name)}</div>
      <div class="item-meta">
        <span>Qty: ${item.qty}</span>
        ${priceText ? `<span class="price">${priceText}</span>` : ''}
      </div>
    </div>
    <button class="btn-delete" aria-label="Remove ${escHtml(item.name)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
      </svg>
    </button>`;

  li.querySelector('.item-check').addEventListener('change', () => toggle(item.id));
  li.querySelector('.btn-delete').addEventListener('click', () => remove(item.id));

  return li;
}

function updateSummary() {
  const total = items.length;
  const done  = items.filter(i => i.done).length;
  const priced = items.filter(i => i.price != null);
  const totalPrice = priced.reduce((s, i) => s + Number(i.price) * i.qty, 0);

  summaryTotal.textContent = `${total} item${total !== 1 ? 's' : ''}`;
  summaryDone.textContent  = `${done} done`;
  summaryPrice.textContent = priced.length ? `Est. $${totalPrice.toFixed(2)}` : '';
}

// ── Actions ───────────────────────────────────────────────────
function addItem(name, qty, price, category) {
  items.push({
    id: Date.now().toString(),
    name: name.trim(),
    qty: Number(qty),
    price: price !== '' ? Number(price) : null,
    category,
    done: false,
    createdAt: Date.now(),
  });
  render();
}

function toggle(id) {
  const item = items.find(i => i.id === id);
  if (item) { item.done = !item.done; render(); }
}

function remove(id) {
  items = items.filter(i => i.id !== id);
  render();
}

// ── Events ────────────────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  const name  = nameInput.value.trim();
  const qty   = qtyInput.value.trim();
  const price = priceInput.value.trim();
  const cat   = catInput.value;

  formError.hidden = true;

  if (!name) { showError('Please enter an item name.'); nameInput.focus(); return; }
  if (!qty || Number(qty) < 1) { showError('Please enter a valid quantity (min 1).'); qtyInput.focus(); return; }
  if (price !== '' && (isNaN(Number(price)) || Number(price) < 0)) {
    showError('Please enter a valid price (or leave it empty).'); priceInput.focus(); return;
  }

  addItem(name, qty, price, cat);
  nameInput.value  = '';
  qtyInput.value   = '1';
  priceInput.value = '';
  nameInput.focus();

  // Ensure the active filter shows the newly added category
  if (activeFilter !== 'all' && activeFilter !== cat) {
    setFilter('all');
  }
});

filterTabs.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (tab) setFilter(tab.dataset.filter);
});

showDone.addEventListener('change', render);

clearDone.addEventListener('click', () => {
  if (!items.some(i => i.done)) return;
  if (confirm('Remove all completed items?')) {
    items = items.filter(i => !i.done);
    render();
  }
});

function setFilter(f) {
  activeFilter = f;
  filterTabs.querySelectorAll('.tab').forEach(t => {
    const sel = t.dataset.filter === f;
    t.classList.toggle('active', sel);
    t.setAttribute('aria-selected', sel);
  });
  render();
}

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──────────────────────────────────────────────────────
render();
nameInput.focus();
