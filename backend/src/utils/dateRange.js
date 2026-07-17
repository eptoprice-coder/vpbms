// Shared "from/to" date-range validation for vendor history endpoints
// (price history, message history, and their exports). A vendor can only
// query the period from their own account creation date up to today.

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Returns { valid: true, from, to } with resolved Date objects, or
// { valid: false, message } describing the first violated rule.
const validateVendorDateRange = (vendorCreatedAt, fromInput, toInput) => {
  const accountStart = startOfDay(vendorCreatedAt);
  const today = startOfDay(new Date());

  const from = fromInput ? startOfDay(fromInput) : accountStart;
  const to = toInput ? startOfDay(toInput) : today;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { valid: false, message: 'Invalid date supplied.' };
  }

  if (from < accountStart) {
    return { valid: false, message: 'Date cannot be earlier than your account creation date.' };
  }
  if (from > today || to > today) {
    return { valid: false, message: 'Future dates are not allowed.' };
  }
  if (to < from) {
    return { valid: false, message: "'To Date' cannot be earlier than 'From Date'." };
  }

  return { valid: true, from, to: endOfDay(to) };
};

module.exports = { validateVendorDateRange, startOfDay, endOfDay };
