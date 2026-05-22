const STORAGE_KEY = 'shopping-list-items';

let items = load();
let activeFilter = 'all';
let editingId = null;

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
  li.dataset.id = item.id;

  if (editingId === item.id) {
    li.className = 'item editing';
    li.innerHTML = `
      <div class="edit-form">
        <div class="edit-row">
          <input class="edit-name" type="text" value="${escHtml(item.name)}" placeholder="Item name" />
          <input class="edit-qty"  type="number" value="${item.qty}" min="1" placeholder="Qty" />
        </div>
        <div class="edit-row">
          <div class="input-prefix edit-price-wrap">
            <span class="prefix">$</span>
            <input class="edit-price" type="number" value="${item.price != null ? item.price : ''}" min="0" step="0.01" placeholder="0.00" />
          </div>
          <select class="edit-cat">
            <option value="food"    ${item.category === 'food'    ? 'selected' : ''}>🍎 Food</option>
            <option value="medical" ${item.category === 'medical' ? 'selected' : ''}>💊 Medical</option>
            <option value="others"  ${item.category === 'others'  ? 'selected' : ''}>📦 Others</option>
          </select>
        </div>
        <div class="edit-error" hidden></div>
        <div class="edit-actions">
          <button class="btn-save">Save</button>
          <button class="btn-cancel">Cancel</button>
        </div>
      </div>`;

    const nameEl  = li.querySelector('.edit-name');
    const qtyEl   = li.querySelector('.edit-qty');
    const priceEl = li.querySelector('.edit-price');
    const catEl   = li.querySelector('.edit-cat');
    const errEl   = li.querySelector('.edit-error');

    nameEl.focus();
    nameEl.select();

    li.querySelector('.btn-save').addEventListener('click', () => {
      const name  = nameEl.value.trim();
      const qty   = qtyEl.value.trim();
      const price = priceEl.value.trim();

      errEl.hidden = true;
      if (!name) { errEl.textContent = 'Name is required.'; errEl.hidden = false; nameEl.focus(); return; }
      if (!qty || Number(qty) < 1) { errEl.textContent = 'Qty must be at least 1.'; errEl.hidden = false; qtyEl.focus(); return; }
      if (price !== '' && (isNaN(Number(price)) || Number(price) < 0)) {
        errEl.textContent = 'Enter a valid price or leave empty.'; errEl.hidden = false; priceEl.focus(); return;
      }

      saveEdit(item.id, name, qty, price, catEl.value);
    });

    li.querySelector('.btn-cancel').addEventListener('click', () => {
      editingId = null;
      render();
    });

    li.addEventListener('keydown', e => {
      if (e.key === 'Enter') li.querySelector('.btn-save').click();
      if (e.key === 'Escape') { editingId = null; render(); }
    });

    return li;
  }

  li.className = `item${item.done ? ' done' : ''}`;
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
    <button class="btn-edit" aria-label="Edit ${escHtml(item.name)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
    <button class="btn-delete" aria-label="Remove ${escHtml(item.name)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
      </svg>
    </button>`;

  li.querySelector('.item-check').addEventListener('change', () => toggle(item.id));
  li.querySelector('.btn-edit').addEventListener('click', () => { editingId = item.id; render(); });
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

function saveEdit(id, name, qty, price, category) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.name     = name.trim();
  item.qty      = Number(qty);
  item.price    = price !== '' ? Number(price) : null;
  item.category = category;
  editingId     = null;
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
