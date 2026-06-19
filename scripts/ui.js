import { init, getRecords, getSettings, addRecord, updateRecord, deleteRecord, replaceAllRecords, updateSettings, formatCurrency } from './state.js';
import { exportJSON, importJSON } from './storage.js';
import { validateForm, validateCategory } from './validators.js';
import { compileRegex, highlight, filterRecords, sortRecords } from './search.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let currentSearch = null;
let currentSort = 'date-desc';

function announce(msg, level = 'polite') {
  const el = level === 'assertive' ? $('#alert-message') : $('#status-message');
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

function showPage(id) {
  $$('.page').forEach(p => {
    p.hidden = p.id !== id;
    p.classList.toggle('active', p.id === id);
  });
  $$('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === id);
  });

  if (id === 'records') renderRecords();

  const nav = $('#main-nav');
  const toggle = $('#menu-toggle');
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}

function initNav() {
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(link.dataset.section);
    });
  });

  $('#menu-toggle').addEventListener('click', () => {
    const nav = $('#main-nav');
    const expanded = nav.classList.toggle('open');
    $('#menu-toggle').setAttribute('aria-expanded', String(expanded));
  });
}

function initForm() {
  const form = $('#transaction-form');
  const editIdField = $('#edit-id');

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

    const editId = editIdField.value;
    if (editId) {
      updateRecord(editId, data);
      announce('Transaction updated.');
    } else {
      addRecord(data);
      announce('Transaction added.');
    }

    form.reset();
    editIdField.value = '';
    $('#form-submit-btn').textContent = 'Add Transaction';
    $('#form-cancel-btn').hidden = true;
    $('#add-edit-heading').textContent = 'Add Record';
    clearFormErrors();
    showPage('records');
  });

  $('#form-cancel-btn').addEventListener('click', () => {
    form.reset();
    editIdField.value = '';
    $('#form-submit-btn').textContent = 'Add Transaction';
    $('#form-cancel-btn').hidden = true;
    $('#add-edit-heading').textContent = 'Add Record';
    clearFormErrors();
  });
}

function showFormErrors(errors) {
  for (const [field, msg] of Object.entries(errors)) {
    $(`#error-${field}`).textContent = msg;
  }
}

function clearFormErrors() {
  $$('.field-error').forEach(el => { el.textContent = ''; });
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

  // rebuild regex for highlighting with global flag
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
    btn.addEventListener('click', () => startEdit(btn.dataset.id));
  });
  tbody.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
  });
}

function renderCards(records) {
  const container = $('#records-cards');
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
    btn.addEventListener('click', () => startEdit(btn.dataset.id));
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

function startEdit(id) {
  const record = getRecords().find(r => r.id === id);
  if (!record) return;

  $('#input-description').value = record.description;
  $('#input-amount').value = record.amount;
  $('#input-category').value = record.category;
  $('#input-date').value = record.date;
  $('#edit-id').value = record.id;
  $('#form-submit-btn').textContent = 'Update Transaction';
  $('#form-cancel-btn').hidden = false;
  $('#add-edit-heading').textContent = 'Edit Record';
  showPage('add-edit');
}

function confirmDelete(id) {
  const record = getRecords().find(r => r.id === id);
  if (!record) return;
  if (!confirm(`Delete "${record.description}"?`)) return;
  deleteRecord(id);
  announce('Transaction deleted.');
  renderRecords();
}

function initSearch() {
  $('#search-input').addEventListener('input', renderRecords);
  $('#search-case-toggle').addEventListener('change', renderRecords);
}

function initSort() {
  $('#sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderRecords();
  });
}

function initSettings() {
  const settings = getSettings();

  renderCategoryList();

  $('#base-currency').value = settings.currency;
  $('#rate-usd').value = settings.rates.USD;
  $('#rate-eur').value = settings.rates.EUR;

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

  $('#rate-eur').addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    if (val > 0) {
      const rates = { ...getSettings().rates, EUR: val };
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
    syncCategoryDropdown();
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
      syncCategoryDropdown();
      announce(`Category "${btn.dataset.cat}" removed.`);
    });
  });
}

function syncCategoryDropdown() {
  const select = $('#input-category');
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
  initSearch();
  initSort();
  initSettings();
  syncCategoryDropdown();
});
