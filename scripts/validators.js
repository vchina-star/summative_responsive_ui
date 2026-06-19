const patterns = {
  description: /^\S(?:.*\S)?$/,
  doubleSpaces: /\s{2,}/,
  // back-reference: catches repeated consecutive words like "the the"
  duplicateWords: /\b(\w+)\s+\1\b/i,
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
};

export function validateDescription(value) {
  if (!value.trim()) return 'Description is required.';
  if (!patterns.description.test(value)) return 'No leading or trailing spaces allowed.';
  if (patterns.doubleSpaces.test(value)) return 'No double spaces allowed.';
  if (patterns.duplicateWords.test(value)) return 'Duplicate consecutive words detected.';
  return '';
}

export function validateAmount(value) {
  if (!value.trim()) return 'Amount is required.';
  if (!patterns.amount.test(value)) return 'Enter a valid number (e.g. 12.50).';
  return '';
}

export function validateDate(value) {
  if (!value.trim()) return 'Date is required.';
  if (!patterns.date.test(value)) return 'Use format YYYY-MM-DD.';
  return '';
}

export function validateCategory(value) {
  if (!value) return 'Category is required.';
  if (!patterns.category.test(value)) return 'Letters, spaces, and hyphens only.';
  return '';
}

export function validateForm({ description, amount, date, category }) {
  const errors = {
    description: validateDescription(description),
    amount: validateAmount(amount),
    date: validateDate(date),
    category: validateCategory(category),
  };
  const valid = Object.values(errors).every(e => e === '');
  return { valid, errors };
}

export { patterns };
