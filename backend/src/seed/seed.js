require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { DEFAULT_CATEGORIES } = require('../config/constants');

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Category = require('../models/Category');
const Product = require('../models/Product');
const VendorProduct = require('../models/VendorProduct');
const Customer = require('../models/Customer');

const run = async () => {
  await connectDB();
  console.log('[Seed] Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Vendor.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    VendorProduct.deleteMany({}),
    Customer.deleteMany({}),
  ]);

  console.log('[Seed] Creating categories...');
  const categories = await Category.insertMany(
    DEFAULT_CATEGORIES.map((c) => ({ name: c.name, icon: c.icon, description: `${c.name} category`, status: 'active' }))
  );
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  console.log('[Seed] Creating super admin...');
  await User.create({
    username: 'admin',
    password: 'Admin@123',
    role: 'super_admin',
    name: 'Super Admin',
    email: 'admin@vpbms.local',
  });

  console.log('[Seed] Creating sample vendor (Vegetables)...');
  const vendorUser = await User.create({
    username: 'freshmart',
    password: 'Vendor@123',
    role: 'vendor',
    name: 'Ravi Kumar',
    email: 'ravi@freshmart.local',
    phone: '9876543210',
  });
  const vendor = await Vendor.create({
    user: vendorUser._id,
    businessName: 'Fresh Mart Vegetables',
    category: catByName['Vegetables']._id,
    address: 'No.12, Koyambedu Market',
    location: 'Chennai',
    whatsappNumber: '919876543210',
  });

  console.log('[Seed] Creating a second vendor (Fruits)...');
  const vendorUser2 = await User.create({
    username: 'fruitking',
    password: 'Vendor@123',
    role: 'vendor',
    name: 'Suresh Babu',
    email: 'suresh@fruitking.local',
    phone: '9876500000',
  });
  const vendor2 = await Vendor.create({
    user: vendorUser2._id,
    businessName: 'Fruit King Wholesale',
    category: catByName['Fruits']._id,
    address: 'No.5, Market Road',
    location: 'Madurai',
    whatsappNumber: '919876500000',
  });

  console.log('[Seed] Creating master products...');
  const vegProducts = [
    { name: 'Tomato', tamilName: 'தக்காளி', unit: 'kg' },
    { name: 'Onion', tamilName: 'வெங்காயம்', unit: 'kg' },
    { name: 'Potato', tamilName: 'உருளைக்கிழங்கு', unit: 'kg' },
    { name: 'Beans', tamilName: 'பீன்ஸ்', unit: 'kg' },
    { name: 'Carrot', tamilName: 'கேரட்', unit: 'kg' },
    { name: 'Brinjal', tamilName: 'கத்தரிக்காய்', unit: 'kg' },
  ].map((p) => ({ ...p, category: catByName['Vegetables']._id, defaultQuantity: 100, status: 'active' }));

  const fruitProducts = [
    { name: 'Apple', tamilName: 'ஆப்பிள்', unit: 'kg' },
    { name: 'Banana', tamilName: 'வாழைப்பழம்', unit: 'dozen' },
    { name: 'Mango', tamilName: 'மாம்பழம்', unit: 'kg' },
    { name: 'Grapes', tamilName: 'திராட்சை', unit: 'kg' },
  ].map((p) => ({ ...p, category: catByName['Fruits']._id, defaultQuantity: 50, status: 'active' }));

  const products = await Product.insertMany([...vegProducts, ...fruitProducts]);

  console.log('[Seed] Assigning prices to vendor 1 (Vegetables)...');
  const vegAssigned = products.filter((p) => String(p.category) === String(catByName['Vegetables']._id));
  await VendorProduct.insertMany(
    vegAssigned.map((p, i) => ({
      vendor: vendor._id,
      product: p._id,
      quantityAvailable: 100,
      currentPrice: 20 + i * 4,
      status: 'active',
    }))
  );

  console.log('[Seed] Assigning prices to vendor 2 (Fruits)...');
  const fruitAssigned = products.filter((p) => String(p.category) === String(catByName['Fruits']._id));
  await VendorProduct.insertMany(
    fruitAssigned.map((p, i) => ({
      vendor: vendor2._id,
      product: p._id,
      quantityAvailable: 50,
      currentPrice: 60 + i * 10,
      status: 'active',
    }))
  );

  console.log('[Seed] Creating sample customers...');
  await Customer.insertMany([
    { vendor: vendor._id, name: 'Hotel Saravana Bhavan', mobile: '9840011111', businessName: 'Saravana Bhavan', location: 'Chennai', group: 'Hotels' },
    { vendor: vendor._id, name: 'Anand Retail Shop', mobile: '9840022222', businessName: 'Anand Stores', location: 'Chennai', group: 'Retail Shops' },
    { vendor: vendor._id, name: 'City Supermarket', mobile: '9840033333', businessName: 'City Supermarket', location: 'Chennai', group: 'Supermarkets' },
    { vendor: vendor2._id, name: 'Madurai Restaurant', mobile: '9840044444', businessName: 'Madurai Restaurant', location: 'Madurai', group: 'Restaurants' },
  ]);

  console.log('[Seed] Done!');
  console.log('----------------------------------------------------');
  console.log('Super Admin login   -> username: admin      password: Admin@123');
  console.log('Vendor login (veg)  -> username: freshmart  password: Vendor@123');
  console.log('Vendor login (fruit)-> username: fruitking  password: Vendor@123');
  console.log('----------------------------------------------------');

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
