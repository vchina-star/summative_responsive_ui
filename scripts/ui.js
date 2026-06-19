import { init, getRecords, getSettings, addRecord, updateRecord, deleteRecord, replaceAllRecords, updateSettings, formatCurrency, toRWF, convertAmount } from './state.js';
import { exportJSON, importJSON } from './storage.js';
import { validateForm, validateCategory } from './validators.js';
import { compileRegex, highlight, filterRecords, sortRecords } from './search.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let currentSearch = null;
let currentSort = 'date-desc';

function announce(msg, level = 'polite') {
  const el = level === 'assertive' ? $('#alert-message') : $('#status-message');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

function initNav() {
  const toggle = $('#menu-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const nav = $('#main-nav');
    const expanded = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(expanded));
  });
}

function initForm() {
  const form = $('#transaction-form');
  if (!form) return;

  const editIdField = $('#edit-id');

  // refill form from id when editing
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  if (editId) {
    const record = getRecords().find(r => r.id === editId);
    if (record) {
      $('#input-description').value = record.description;
      $('#input-amount').value = record.amount;
      $('#input-category').value = record.category;
      $('#input-date').value = record.date;
      editIdField.value = record.id;
      $('#form-submit-btn').textContent = 'Update Transaction';
      $('#form-cancel-btn').hidden = false;
      $('#add-edit-heading').textContent = 'Edit Record';
    }
  }

  syncCategoryDropdown();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      description: $('#input-description').value,
      amount: $('#input-amount').value,
      category: $('#input-category').value,
      date: $('#input-date').value,
    };

    const { valid, errors } = validateForm(data);
    showFormErrors(errors);
    if (!valid) {
      announce('Form has errors. Please correct them.', 'assertive');
      return;
    }

    if (editIdField.value) {
      updateRecord(editIdField.value, data);
      announce('Transaction updated.');
    } else {
      addRecord(data);
      announce('Transaction added.');
    }

    window.location.href = 'records.html';
  });

  $('#form-cancel-btn').addEventListener('click', () => {
    window.location.href = 'records.html';
  });
}

function showFormErrors(errors) {
  for (const [field, msg] of Object.entries(errors)) {
    const el = $(`#error-${field}`);
    if (el) el.textContent = msg;
  }
}

function clearFormErrors() {
  $$('.field-error').forEach(el => { el.textContent = ''; });
}

function initRecords() {
  if (!$('#records-body')) return;
  renderRecords();
  $('#search-input').addEventListener('input', renderRecords);
  $('#search-case-toggle').addEventListener('change', renderRecords);
  $('#sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderRecords();
  });
}

function renderRecords() {
  let records = getRecords();
  const searchInput = $('#search-input').value.trim();
  const caseInsensitive = $('#search-case-toggle').checked;
  const flags = caseInsensitive ? 'gi' : 'g';

  if (searchInput) {
    currentSearch = compileRegex(searchInput, flags);
    if (!currentSearch) {
      $('#search-error').textContent = 'Invalid regex pattern.';
      return;
    }
    $('#search-error').textContent = '';
    records = filterRecords(records, compileRegex(searchInput, caseInsensitive ? 'i' : ''));
  } else {
    currentSearch = null;
    $('#search-error').textContent = '';
  }

  records = sortRecords(records, currentSort);
  renderTable(records);
  renderCards(records);
}

function renderTable(records) {
  const tbody = $('#records-body');
  if (records.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No records found.</td></tr>';
    return;
  }

  const hlRe = currentSearch;

  tbody.innerHTML = records.map(r => `
    <tr data-id="${r.id}">
      <td>${escapeHTML(r.date)}</td>
      <td>${hlRe ? highlight(r.description, hlRe) : escapeHTML(r.description)}</td>
      <td>${formatCurrency(r.amount)}</td>
      <td>${hlRe ? highlight(r.category, hlRe) : escapeHTML(r.category)}</td>
      <td>
        <button class="action-btn edit" data-id="${r.id}" aria-label="Edit ${escapeHTML(r.description)}">Edit</button>
        <button class="action-btn delete" data-id="${r.id}" aria-label="Delete ${escapeHTML(r.description)}">Delete</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `add-edit.html?edit=${btn.dataset.id}`;
    });
  });
  tbody.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
  });
}

function renderCards(records) {
  const container = $('#records-cards');
  if (!container) return;
  if (records.length === 0) {
    container.innerHTML = '<p class="empty-row">No records found.</p>';
    return;
  }

  const hlRe = currentSearch;

  container.innerHTML = records.map(r => `
    <div class="record-card" data-id="${r.id}">
      <div class="card-header">
        <span class="card-description">${hlRe ? highlight(r.description, hlRe) : escapeHTML(r.description)}</span>
        <span class="card-amount">${formatCurrency(r.amount)}</span>
      </div>
      <div class="card-meta">
        ${hlRe ? highlight(r.category, hlRe) : escapeHTML(r.category)} &middot; ${escapeHTML(r.date)}
      </div>
      <div class="card-actions">
        <button class="action-btn edit" data-id="${r.id}" aria-label="Edit ${escapeHTML(r.description)}">Edit</button>
        <button class="action-btn delete" data-id="${r.id}" aria-label="Delete ${escapeHTML(r.description)}">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `add-edit.html?edit=${btn.dataset.id}`;
    });
  });
  container.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
  });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function confirmDelete(id) {
  const record = getRecords().find(r => r.id === id);
  if (!record) return;
  if (!confirm(`Delete "${record.description}"?`)) return;
  deleteRecord(id);
  announce('Transaction deleted.');
  renderRecords();
}

function initDashboard() {
  if (!$('#stat-total-count')) return;
  renderDashboard();
  initBudget();
}

function renderDashboard() {
  const records = getRecords();
  const settings = getSettings();

  $('#stat-total-count').textContent = records.length;

  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  $('#stat-total-amount').textContent = formatCurrency(totalAmount);

  if (records.length > 0) {
    const catTotals = {};
    records.forEach(r => {
      catTotals[r.category] = (catTotals[r.category] || 0) + r.amount;
    });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    $('#stat-top-category').textContent = topCat[0];
  } else {
    $('#stat-top-category').textContent = '—';
  }

  renderBudgetStatus(totalAmount, settings);
  renderTrendChart(records);
}

function renderBudgetStatus(totalSpent, settings) {
  const cap = settings.budgetCap;
  const statusEl = $('#budget-status');
  const msgEl = $('#budget-remaining');

  if (cap === null || cap === undefined) {
    statusEl.setAttribute('aria-live', 'polite');
    msgEl.textContent = 'Set a budget to track spending.';
    return;
  }

  const remaining = cap - totalSpent;

  if (remaining >= 0) {
    statusEl.setAttribute('aria-live', 'polite');
    msgEl.textContent = `${formatCurrency(remaining)} remaining of ${formatCurrency(cap)} budget.`;
  } else {
    statusEl.setAttribute('aria-live', 'assertive');
    msgEl.textContent = `Over budget by ${formatCurrency(Math.abs(remaining))}! Budget was ${formatCurrency(cap)}.`;
  }
}

function initBudget() {
  const settings = getSettings();
  if (settings.budgetCap !== null) {
    // display cap converted to the active currency
    $('#budget-cap-input').value = convertAmount(settings.budgetCap, settings.currency).toFixed(2);
  }

  $('#set-budget-btn').addEventListener('click', () => {
    const raw = $('#budget-cap-input').value.trim();
    if (raw === '' || parseFloat(raw) === 0) {
      updateSettings({ budgetCap: null });
      $('#budget-cap-input').value = '';
      announce('Budget cleared.');
      renderDashboard();
      return;
    }
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) {
      announce('Enter a valid budget amount.', 'assertive');
      return;
    }
    // store active currency as RWF
    const inRWF = toRWF(val, getSettings().currency);
    updateSettings({ budgetCap: inRWF });
    announce(`Budget set to ${formatCurrency(inRWF)}.`);
    renderDashboard();
  });
}

function renderTrendChart(records) {
  const chart = $('#trend-chart');
  if (!chart) return;
  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const total = records
      .filter(r => r.date === dateStr)
      .reduce((sum, r) => sum + r.amount, 0);
    days.push({ label: dateStr.slice(5), total });
  }

  const max = Math.max(...days.map(d => d.total), 1);

  chart.innerHTML = days.map(d => {
    const pct = (d.total / max) * 100;
    return `<div class="bar-group">
      <div class="bar" style="height:${pct}%" title="${d.label}: ${formatCurrency(d.total)}"></div>
      <span class="bar-label">${d.label}</span>
    </div>`;
  }).join('');
}

function initSettings() {
  if (!$('#base-currency')) return;

  const settings = getSettings();
  renderCategoryList();

  $('#base-currency').value = settings.currency;
  $('#rate-usd').value = settings.rates.USD;
  $('#rate-ugx').value = settings.rates.UGX;

  $('#base-currency').addEventListener('change', (e) => {
    updateSettings({ currency: e.target.value });
    announce(`Currency set to ${e.target.value}.`);
  });

  $('#rate-usd').addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    if (val > 0) {
      const rates = { ...getSettings().rates, USD: val };
      updateSettings({ rates });
    }
  });

  $('#rate-ugx').addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    if (val > 0) {
      const rates = { ...getSettings().rates, UGX: val };
      updateSettings({ rates });
    }
  });

  $('#add-category-btn').addEventListener('click', () => {
    const input = $('#new-category-input');
    const value = input.value.trim();
    const error = validateCategory(value);
    if (error) {
      $('#error-new-category').textContent = error;
      return;
    }
    const cats = getSettings().categories;
    if (cats.map(c => c.toLowerCase()).includes(value.toLowerCase())) {
      $('#error-new-category').textContent = 'Category already exists.';
      return;
    }
    cats.push(value);
    updateSettings({ categories: cats });
    input.value = '';
    $('#error-new-category').textContent = '';
    renderCategoryList();
    announce(`Category "${value}" added.`);
  });

  $('#export-btn').addEventListener('click', () => {
    exportJSON(getRecords());
    announce('Data exported.');
  });

  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await importJSON(file);
      replaceAllRecords(data);
      announce(`Imported ${data.length} records.`);
      $('#import-status').textContent = `Imported ${data.length} records.`;
    } catch (err) {
      announce(err.message, 'assertive');
      $('#import-status').textContent = err.message;
    }
    e.target.value = '';
  });
}

function renderCategoryList() {
  const list = $('#category-list');
  if (!list) return;
  const cats = getSettings().categories;
  list.innerHTML = cats.map(cat => `
    <li>
      ${escapeHTML(cat)}
      <button class="remove-cat-btn" data-cat="${escapeHTML(cat)}" aria-label="Remove ${escapeHTML(cat)}">&times;</button>
    </li>
  `).join('');

  list.querySelectorAll('.remove-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const updated = getSettings().categories.filter(c => c !== btn.dataset.cat);
      updateSettings({ categories: updated });
      renderCategoryList();
      announce(`Category "${btn.dataset.cat}" removed.`);
    });
  });
}

function syncCategoryDropdown() {
  const select = $('#input-category');
  if (!select) return;
  const current = select.value;
  const cats = getSettings().categories;
  select.innerHTML = '<option value="">Select a category</option>' +
    cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  if (cats.includes(current)) select.value = current;
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  initNav();
  initForm();
  initRecords();
  initDashboard();
  initSettings();
});
