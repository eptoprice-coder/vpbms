// Builds a formatted price-list message and an official wa.me deep link.
// No unofficial WhatsApp APIs are used anywhere in this system.

const formatDate = (date = new Date()) => {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const buildPriceListMessage = ({ header, items, footer, date = new Date() }) => {
  const lines = [];
  lines.push(header || '🌿 Fresh Market Price List');
  lines.push(`Date : ${formatDate(date)}`);
  lines.push('');
  items.forEach((item) => {
    lines.push(`${item.name} - ₹${item.price}/${item.unit}`);
  });
  lines.push('');
  lines.push(footer || 'Thank you.');
  return lines.join('\n');
};

// Sanitizes a mobile number to digits only, assumes India (+91) if no country code given.
const sanitizeMobile = (mobile) => {
  let digits = String(mobile).replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
};

const buildWaLink = (mobile, message) => {
  const phone = sanitizeMobile(mobile);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

module.exports = { buildPriceListMessage, buildWaLink, sanitizeMobile, formatDate };
