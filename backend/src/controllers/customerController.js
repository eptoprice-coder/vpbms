const Customer = require('../models/Customer');
const asyncHandler = require('../middleware/asyncHandler');
const logActivity = require('../middleware/activityLogger');
const { exportToExcel, exportToPDF } = require('../utils/export');

// Every vendor always has the official EPTOMART contact in their customer list.
// Runs on every list fetch, so existing vendors get it too (upsert = no duplicates).
const EPTOMART_CONTACT = { name: 'EPTOMART', mobile: '+919514519518' };
const ensureEptomartContact = async (vendorId) => {
  await Customer.updateOne(
    { vendor: vendorId, mobile: EPTOMART_CONTACT.mobile },
    { $setOnInsert: { ...EPTOMART_CONTACT, vendor: vendorId, group: 'Other', remarks: 'Official Eptomart contact', status: 'active' } },
    { upsert: true }
  );
};

// GET /api/vendor/customers
const listCustomers = asyncHandler(async (req, res) => {
  await ensureEptomartContact(req.vendor._id);
  const { search, group, status, page = 1, limit = 50 } = req.query;
  const filter = { vendor: req.vendor._id };
  if (group) filter.group = group;
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  const total = await Customer.countDocuments(filter);
  const customers = await Customer.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(Number(limit));

  res.json({ success: true, data: customers, total, page: Number(page), limit: Number(limit) });
});

// POST /api/vendor/customers
const createCustomer = asyncHandler(async (req, res) => {
  const { name, mobile, businessName, location, group, remarks } = req.body;
  if (!name || !mobile) return res.status(400).json({ success: false, message: 'Name and mobile are required.' });

  const customer = await Customer.create({ vendor: req.vendor._id, name, mobile, businessName, location, group, remarks });

  await logActivity({ user: req.user._id, vendor: req.vendor._id, action: 'CUSTOMER_ADDED', description: `Added customer "${name}"`, ip: req.ip });
  res.status(201).json({ success: true, data: customer });
});

// POST /api/vendor/customers/import - bulk manual/CSV import
const importCustomers = asyncHandler(async (req, res) => {
  const { customers } = req.body; // array of { name, mobile, businessName, location, group, remarks }
  if (!Array.isArray(customers) || !customers.length) {
    return res.status(400).json({ success: false, message: 'No customers supplied for import.' });
  }

  let imported = 0;
  let skipped = 0;
  for (const c of customers) {
    if (!c.name || !c.mobile) { skipped++; continue; }
    try {
      await Customer.create({ vendor: req.vendor._id, ...c });
      imported++;
    } catch (e) {
      skipped++; // likely duplicate mobile for this vendor
    }
  }

  await logActivity({
    user: req.user._id,
    vendor: req.vendor._id,
    action: 'CUSTOMER_ADDED',
    description: `Imported ${imported} customer(s), ${skipped} skipped`,
    ip: req.ip,
  });

  res.json({ success: true, imported, skipped });
});

// PUT /api/vendor/customers/:id
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, vendor: req.vendor._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

  await logActivity({ user: req.user._id, vendor: req.vendor._id, action: 'CUSTOMER_UPDATED', description: `Updated customer "${customer.name}"`, ip: req.ip });
  res.json({ success: true, data: customer });
});

// DELETE /api/vendor/customers/:id
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, vendor: req.vendor._id });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

  await logActivity({ user: req.user._id, vendor: req.vendor._id, action: 'CUSTOMER_DELETED', description: `Deleted customer "${customer.name}"`, ip: req.ip });
  res.json({ success: true, message: 'Customer deleted.' });
});

// DELETE /api/vendor/customers/bulk - bulk delete via checkbox selection
const bulkDeleteCustomers = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, message: 'No IDs supplied.' });
  const result = await Customer.deleteMany({ _id: { $in: ids }, vendor: req.vendor._id });
  await logActivity({ user: req.user._id, vendor: req.vendor._id, action: 'CUSTOMER_DELETED', description: `Bulk deleted ${result.deletedCount} customer(s)`, ip: req.ip });
  res.json({ success: true, deleted: result.deletedCount });
});

// GET /api/vendor/customers/export?format=pdf|excel
const exportCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ vendor: req.vendor._id }).sort({ name: 1 });
  const columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Mobile', key: 'mobile', width: 18 },
    { header: 'Business', key: 'businessName', width: 25 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Group', key: 'group', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  const rows = customers.map((c) => c.toObject());

  if (req.query.format === 'excel') return exportToExcel(res, { filename: 'customers', columns, rows });
  return exportToPDF(res, { title: 'Customer List', columns, rows });
});

module.exports = { listCustomers, createCustomer, importCustomers, updateCustomer, deleteCustomer, bulkDeleteCustomers, exportCustomers };
