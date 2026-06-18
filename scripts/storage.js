const RECORDS_KEY = 'sft:records';
const SETTINGS_KEY = 'sft:settings';

export function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function exportJSON(records) {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'finance-tracker-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const error = validateImport(data);
        if (error) {
          reject(new Error(error));
        } else {
          resolve(data);
        }
      } catch {
        reject(new Error('Invalid JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

function validateImport(data) {
  if (!Array.isArray(data)) {
    return 'Import must be a JSON array of records.';
  }

  const requiredFields = ['id', 'description', 'amount', 'category', 'date'];

  for (let i = 0; i < data.length; i++) {
    const rec = data[i];
    if (typeof rec !== 'object' || rec === null) {
      return `Item ${i} is not an object.`;
    }
    for (const field of requiredFields) {
      if (!(field in rec)) {
        return `Item ${i} is missing required field "${field}".`;
      }
    }
    if (typeof rec.amount !== 'number' || rec.amount < 0) {
      return `Item ${i} has an invalid amount.`;
    }
  }

  return null;
}
