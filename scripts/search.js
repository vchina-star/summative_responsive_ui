export function compileRegex(input, flags = 'i') {
  if (!input) return null;
  try {
    return new RegExp(input, flags);
  } catch {
    return null;
  }
}

export function highlight(text, re) {
  if (!re) return escapeHTML(text);
  return escapeHTML(text).replace(re, m => `<mark>${m}</mark>`);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function filterRecords(records, re) {
  if (!re) return records;
  return records.filter(r =>
    re.test(r.description) ||
    re.test(r.category) ||
    re.test(String(r.amount)) ||
    re.test(r.date)
  );
}

export function sortRecords(records, sortKey) {
  const sorted = [...records];
  switch (sortKey) {
    case 'date-asc':
      sorted.sort((a, b) => a.date.localeCompare(b.date));
      break;
    case 'date-desc':
      sorted.sort((a, b) => b.date.localeCompare(a.date));
      break;
    case 'description-asc':
      sorted.sort((a, b) => a.description.localeCompare(b.description));
      break;
    case 'description-desc':
      sorted.sort((a, b) => b.description.localeCompare(a.description));
      break;
    case 'amount-asc':
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    case 'amount-desc':
      sorted.sort((a, b) => b.amount - a.amount);
      break;
  }
  return sorted;
}
