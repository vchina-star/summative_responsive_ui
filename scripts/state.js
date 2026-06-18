import { loadRecords, saveRecords, loadSettings, saveSettings } from './storage.js';

const DEFAULT_SETTINGS = {
  currency: 'RWF',
  rates: { USD: 1300, EUR: 1400 },
  categories: ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'],
  budgetCap: null,
};

let records = [];
let settings = { ...DEFAULT_SETTINGS };
let nextId = 1;

export function init() {
  records = loadRecords();
  const saved = loadSettings();
  if (saved) {
    settings = { ...DEFAULT_SETTINGS, ...saved };
  }
  if (records.length > 0) {
    const maxNum = records.reduce((max, r) => {
      const num = parseInt(r.id.replace('txn_', ''), 10);
      return num > max ? num : max;
    }, 0);
    nextId = maxNum + 1;
  }
}

function generateId() {
  return `txn_${String(nextId++).padStart(4, '0')}`;
}

function timestamp() {
  return new Date().toISOString();
}

export function getRecords() {
  return [...records];
}

export function getSettings() {
  return { ...settings };
}

export function addRecord({ description, amount, category, date }) {
  const now = timestamp();
  const record = {
    id: generateId(),
    description,
    amount: parseFloat(amount),
    category,
    date,
    createdAt: now,
    updatedAt: now,
  };
  records.push(record);
  saveRecords(records);
  return record;
}

export function updateRecord(id, fields) {
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return null;
  records[index] = {
    ...records[index],
    ...fields,
    amount: fields.amount !== undefined ? parseFloat(fields.amount) : records[index].amount,
    updatedAt: timestamp(),
  };
  saveRecords(records);
  return records[index];
}

export function deleteRecord(id) {
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return false;
  records.splice(index, 1);
  saveRecords(records);
  return true;
}

export function replaceAllRecords(imported) {
  records = imported.map(r => ({
    ...r,
    amount: parseFloat(r.amount),
  }));
  if (records.length > 0) {
    const maxNum = records.reduce((max, r) => {
      const num = parseInt(r.id.replace('txn_', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    nextId = maxNum + 1;
  } else {
    nextId = 1;
  }
  saveRecords(records);
}

export function updateSettings(partial) {
  settings = { ...settings, ...partial };
  saveSettings(settings);
}

export function convertAmount(amountInRWF, toCurrency) {
  if (toCurrency === 'RWF') return amountInRWF;
  const rate = settings.rates[toCurrency];
  if (!rate || rate <= 0) return amountInRWF;
  return amountInRWF / rate;
}

export function formatCurrency(amount) {
  const curr = settings.currency;
  const symbols = { RWF: 'RWF ', USD: '$', EUR: '€' };
  const converted = convertAmount(amount, curr);
  const prefix = symbols[curr] || curr + ' ';
  return prefix + converted.toFixed(2);
}
