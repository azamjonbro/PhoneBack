const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const InventoryEntry = require('../models/InventoryEntry');
const Sale = require('../models/Sale');
const Accessory = require('../models/Accessory');
const Setting = require('../models/Setting');
const Expense = require('../models/Expense');
const MoneyReceipt = require('../models/MoneyReceipt');
const MoneyPayment = require('../models/MoneyPayment');
const History = require('../models/History');
const Installment = require('../models/Installment');

const seedData = async () => {
  try {
    console.log('Clearing database and recreating indexes...');

    // Drop all data across all collections
    await User.deleteMany({});
    await Supplier.deleteMany({});
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await InventoryEntry.deleteMany({});
    await Sale.deleteMany({});
    await Accessory.deleteMany({});
    await Setting.deleteMany({});
    await Expense.deleteMany({});
    await MoneyReceipt.deleteMany({});
    await MoneyPayment.deleteMany({});
    await History.deleteMany({});
    await Installment.deleteMany({});

    // Drop indexes safely
    const dropIndexSafely = async (model) => {
      try {
        await model.collection.dropIndexes();
      } catch (err) {
        // Ignored
      }
    };

    await dropIndexSafely(Product);
    await dropIndexSafely(InventoryEntry);
    await dropIndexSafely(Sale);
    await dropIndexSafely(Accessory);
    await dropIndexSafely(Customer);
    await dropIndexSafely(Installment);

    console.log('All collections cleared. Seeding fresh realistic demo data...');

    // 1. Create Default Users
    const adminUser = await User.create({
      username: 'admin',
      password: 'admin123',
      name: 'System Admin',
      role: 'Admin',
      permissions: ['inventory:read', 'inventory:write', 'sales', 'expenses', 'reports', 'settings'],
      isActive: true
    });

    const employeeUser = await User.create({
      username: 'employee',
      password: 'employee123',
      name: 'John Staff',
      role: 'Employee',
      permissions: ['inventory:read', 'sales', 'expenses'],
      isActive: true
    });

    // 2. Create Global Settings
    await Setting.create({
      shopName: 'Antigravity Mobile Solutions',
      currency: 'USD',
      lowStockThreshold: 5,
      receiptFooter: 'Thank you for buying from Antigravity Mobile! Please keep this receipt for warranty claims.'
    });

    // 3. Create Suppliers
    const appleSupplier = await Supplier.create({
      name: 'Apple Inc. Distributor',
      contactPerson: 'Sarah Jenkins',
      phone: '+1 555 987 6543',
      email: 'supply@apple.com',
      balance: -5000
    });

    const samsungSupplier = await Supplier.create({
      name: 'Samsung Trade Co.',
      contactPerson: 'David Kim',
      phone: '+1 555 876 5432',
      email: 'orders@samsungtrade.com',
      balance: -2500
    });

    const genericSupplier = await Supplier.create({
      name: 'Global Accessories Wholesale',
      contactPerson: 'Cheng Lee',
      phone: '+86 139 1234 5678',
      email: 'sales@globalacc.com',
      balance: 0
    });

    // 4. Create Customers
    const customerData = [
      { name: 'Jasur Alimov', phone: '+998901234501', email: 'jasur@mail.uz', balance: 0 },
      { name: 'Dilnoza Karimova', phone: '+998931234502', email: 'dilnoza@mail.uz', balance: 0 },
      { name: 'Sardorbek Rahimov', phone: '+998941234503', email: 'sardor@mail.uz', balance: 0 },
      { name: 'Madina Usmonova', phone: '+998951234504', email: 'madina@mail.uz', balance: 0 },
      { name: 'Otabek Solihov', phone: '+998971234505', email: 'otabek@mail.uz', balance: 0 },
      { name: 'Shahzoda Umarova', phone: '+998991234506', email: 'shahzoda@mail.uz', balance: 0 },
      { name: 'Farrux Tojiyev', phone: '+998909876507', email: 'farrux@mail.uz', balance: 0 },
      { name: 'Nigora Aslanova', phone: '+998939876508', email: 'nigora@mail.uz', balance: 0 },
      { name: 'Rustam Abdullayev', phone: '+998949876509', email: 'rustam@mail.uz', balance: 0 },
      { name: 'Lobar Hoshimova', phone: '+998959876510', email: 'lobar@mail.uz', balance: 0 }
    ];

    const customers = [];
    for (const c of customerData) {
      const created = await Customer.create(c);
      customers.push(created);
    }

    // 5. Create Products
    const productsData = [
      { name: 'iPhone 13', brand: 'Apple', storage: '128GB', condition: 'Used' },
      { name: 'iPhone 14 Pro', brand: 'Apple', storage: '128GB', condition: 'Used' },
      { name: 'iPhone 15 Pro Max', brand: 'Apple', storage: '256GB', condition: 'New' },
      { name: 'Galaxy S24 Ultra', brand: 'Samsung', storage: '512GB', condition: 'New' },
      { name: 'Galaxy A55', brand: 'Samsung', storage: '128GB', condition: 'New' },
      { name: 'Note 14 Pro', brand: 'Redmi', storage: '256GB', condition: 'New' },
      { name: '13', brand: 'Redmi', storage: '128GB', condition: 'New' },
      { name: 'X7 Pro', brand: 'Poco', storage: '256GB', condition: 'New' },
      { name: 'X9', brand: 'Honor', storage: '128GB', condition: 'Used' },
      { name: 'Pixel 9', brand: 'Google', storage: '128GB', condition: 'New' },
      { name: 'iPhone 13 Pro', brand: 'Apple', storage: '256GB', condition: 'Used' },
      { name: 'Galaxy S23 Ultra', brand: 'Samsung', storage: '256GB', condition: 'Used' },
      { name: 'iPhone 14 Pro Max', brand: 'Apple', storage: '256GB', condition: 'Used' }
    ];

    const products = {};
    for (const p of productsData) {
      const created = await Product.create(p);
      products[p.name] = created;
    }

    const today = new Date();

    // 6. Create Inventory Entries
    const entriesData = [
      { product: 'iPhone 13 Pro', qty: 5, price: 680, supplier: appleSupplier._id, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) },
      { product: 'Galaxy S23 Ultra', qty: 3, price: 820, supplier: samsungSupplier._id, date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000) },
      { product: 'iPhone 14 Pro Max', qty: 2, price: 900, supplier: appleSupplier._id, date: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000) },
      { product: 'iPhone 13', qty: 10, price: 520, supplier: appleSupplier._id, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) },
      { product: 'iPhone 14 Pro', qty: 4, price: 780, supplier: appleSupplier._id, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) },
      { product: 'iPhone 15 Pro Max', qty: 5, price: 1050, supplier: appleSupplier._id, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) },
      { product: 'Galaxy S24 Ultra', qty: 6, price: 980, supplier: samsungSupplier._id, date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000) },
      { product: 'Galaxy A55', qty: 12, price: 310, supplier: samsungSupplier._id, date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000) },
      { product: 'Note 14 Pro', qty: 15, price: 240, supplier: genericSupplier._id, date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
      { product: '13', qty: 20, price: 130, supplier: genericSupplier._id, date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
      { product: 'X7 Pro', qty: 8, price: 290, supplier: genericSupplier._id, date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) },
      { product: 'X9', qty: 7, price: 190, supplier: genericSupplier._id, date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) },
      { product: 'Pixel 9', qty: 6, price: 650, supplier: genericSupplier._id, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) }
    ];

    for (const ent of entriesData) {
      await InventoryEntry.create({
        productId: products[ent.product]._id,
        quantity: ent.qty,
        buyPrice: ent.price,
        supplierId: ent.supplier,
        createdBy: adminUser._id,
        createdAt: ent.date,
        updatedAt: ent.date
      });
    }

    // 7. Seed Past Sales History
    const sale1 = await Sale.create({
      productId: products['iPhone 13 Pro']._id,
      quantity: 1,
      sellingPrice: 820,
      buyPrice: 680,
      customerId: customers[0]._id,
      invoiceNumber: 'INV-20260703-1001',
      paymentType: 'Cash',
      paymentDetails: { cashAmount: 800, cardAmount: 0, transferAmount: 0 },
      createdBy: employeeUser._id,
      createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000)
    });

    const sale2 = await Sale.create({
      productId: products['Galaxy S23 Ultra']._id,
      quantity: 1,
      sellingPrice: 970,
      buyPrice: 820,
      customerId: customers[1]._id,
      invoiceNumber: 'INV-20260705-1002',
      paymentType: 'Card',
      paymentDetails: { cashAmount: 0, cardAmount: 970, transferAmount: 0 },
      createdBy: employeeUser._id,
      createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
    });

    // 8. Create Accessories
    await Accessory.create([
      { name: 'Apple 20W USB-C Power Adapter', category: 'Adapters', purchasePrice: 9, sellingPrice: 20, quantity: 40, supplier: appleSupplier._id, barcode: '190199535072', stockAlert: 5 },
      { name: 'Samsung 45W Travel Adapter', category: 'Adapters', purchasePrice: 14, sellingPrice: 30, quantity: 25, supplier: samsungSupplier._id, barcode: '880609014184', stockAlert: 5 },
      { name: 'Anker USB-C to USB-C Cable (3ft)', category: 'USB Cable', purchasePrice: 4, sellingPrice: 10, quantity: 50, supplier: genericSupplier._id, barcode: '848061038590', stockAlert: 10 },
      { name: 'Baseus Lightning to USB-C Cable', category: 'USB Cable', purchasePrice: 3.5, sellingPrice: 9, quantity: 45, supplier: genericSupplier._id, barcode: '695315632901', stockAlert: 8 },
      { name: 'iPhone 15 Pro Max 9D Tempered Glass', category: 'Glass', purchasePrice: 1.5, sellingPrice: 7, quantity: 100, supplier: genericSupplier._id, barcode: '697235081014', stockAlert: 15 },
      { name: 'Galaxy S24 Ultra Silicone Case (Black)', category: 'Cases', purchasePrice: 2.5, sellingPrice: 12, quantity: 30, supplier: genericSupplier._id, barcode: '697235081015', stockAlert: 5 },
      { name: 'Apple AirPods Pro 2', category: 'Bluetooth Devices', purchasePrice: 175, sellingPrice: 235, quantity: 12, supplier: appleSupplier._id, barcode: '194253397472', stockAlert: 3 },
      { name: 'Xiaomi Power Bank 20000mAh', category: 'Power Bank', purchasePrice: 16, sellingPrice: 28, quantity: 18, supplier: genericSupplier._id, barcode: '693417771542', stockAlert: 4 },
      { name: 'Redmi Watch 4', category: 'Smart Watch', purchasePrice: 45, sellingPrice: 70, quantity: 8, supplier: genericSupplier._id, barcode: '694181275990', stockAlert: 2 }
    ]);

    // 9. Seed Installments
    const firstPaymentBase = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Installment 1: Active
    const installment1_firstDate = new Date(firstPaymentBase.getTime() - 15 * 24 * 60 * 60 * 1000);
    const installment1_nextDate = new Date(installment1_firstDate);
    installment1_nextDate.setMonth(installment1_nextDate.getMonth() + 1);

    await Installment.create({
      customerName: customers[2].name,
      customerPhone: customers[2].phone,
      customer: customers[2]._id,
      items: [{
        itemType: 'Product',
        itemId: products['iPhone 14 Pro Max']._id,
        name: 'Apple iPhone 14 Pro Max (x1)',
        sellingPrice: 1100,
        purchasePrice: 900
      }],
      totalPrice: 1100,
      initialPayment: 300,
      remainingDebt: 800,
      monthlyPayment: 200,
      numberOfMonths: 4,
      firstPaymentDate: installment1_firstDate,
      nextPaymentDate: installment1_nextDate,
      notes: 'Active installment customer',
      status: 'Active',
      payments: [{
        amount: 200,
        date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        method: 'Cash',
        notes: '1st monthly payment',
        receivedBy: employeeUser._id,
        receivedByName: employeeUser.name
      }],
      totalPaid: 500,
      createdBy: employeeUser._id
    });

    // Installment 2: Overdue
    const installment2_firstDate = new Date(firstPaymentBase.getTime() - 35 * 24 * 60 * 60 * 1000);
    const installment2_nextDate = new Date(installment2_firstDate);
    installment2_nextDate.setMonth(installment2_nextDate.getMonth() + 1);

    await Installment.create({
      customerName: customers[3].name,
      customerPhone: customers[3].phone,
      customer: customers[3]._id,
      items: [{
        itemType: 'Product',
        itemId: products['iPhone 14 Pro']._id,
        name: 'Apple iPhone 14 Pro (x1)',
        sellingPrice: 950,
        purchasePrice: 780
      }],
      totalPrice: 950,
      initialPayment: 250,
      remainingDebt: 700,
      monthlyPayment: 175,
      numberOfMonths: 4,
      firstPaymentDate: installment2_firstDate,
      nextPaymentDate: installment2_nextDate,
      notes: 'Customer missed their 1st payment',
      status: 'Overdue',
      payments: [],
      totalPaid: 250,
      createdBy: employeeUser._id
    });

    // Installment 3: PaidOff
    const installment3_firstDate = new Date(firstPaymentBase.getTime() - 95 * 24 * 60 * 60 * 1000);

    await Installment.create({
      customerName: customers[4].name,
      customerPhone: customers[4].phone,
      customer: customers[4]._id,
      items: [{
        itemType: 'Product',
        itemId: products['iPhone 13']._id,
        name: 'Apple iPhone 13 (x1)',
        sellingPrice: 650,
        purchasePrice: 520
      }],
      totalPrice: 650,
      initialPayment: 250,
      remainingDebt: 0,
      monthlyPayment: 200,
      numberOfMonths: 2,
      firstPaymentDate: installment3_firstDate,
      nextPaymentDate: null,
      notes: 'Paid off successfully ahead of time',
      status: 'PaidOff',
      payments: [
        {
          amount: 200,
          date: new Date(installment3_firstDate.getTime() + 2 * 24 * 60 * 60 * 1000),
          method: 'Transfer',
          notes: 'First installment payment',
          receivedBy: employeeUser._id,
          receivedByName: employeeUser.name
        },
        {
          amount: 200,
          date: new Date(installment3_firstDate.getTime() + 32 * 24 * 60 * 60 * 1000),
          method: 'Cash',
          notes: 'Second and final payment',
          receivedBy: employeeUser._id,
          receivedByName: employeeUser.name
        }
      ],
      totalPaid: 650,
      createdBy: employeeUser._id
    });

    // 10. Seed Expenses
    await Expense.create([
      { category: 'Rent', amount: 800, description: 'Monthly store rental fee', createdBy: adminUser._id, date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) },
      { category: 'Electricity', amount: 120, description: 'Electricity bills for June', createdBy: adminUser._id, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) },
      { category: 'Internet', amount: 35, description: 'Internet provider subscription', createdBy: employeeUser._id, date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) },
      { category: 'Food', amount: 15, description: 'Staff lunch', createdBy: employeeUser._id, date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) }
    ]);

    // 11. Seed Cash In/Out transactions
    await MoneyReceipt.create({
      amount: 150,
      reason: 'Refund for accessory batch',
      customer: 'Jasur Alimov',
      description: 'Refund for a faulty watch batch returned',
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
    });

    await MoneyPayment.create({
      amount: 400,
      supplier: 'Global Accessories Wholesale',
      reason: 'Additional chargers ordering deposit',
      description: 'Deposit for wholesale charger adapter purchase',
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
    });

    // Seed history actions
    await History.create([
      { action: 'Database Reset', details: 'Database reset & seeded with clean fresh realistic demo records', createdBy: adminUser._id, username: adminUser.username, date: new Date() },
      { action: 'User Login', details: 'Admin logged in', createdBy: adminUser._id, username: adminUser.username, date: new Date(today.getTime() - 10 * 60 * 1000) }
    ]);

    console.log('CRM Database seeded successfully with fresh realistic demo data!');
  } catch (error) {
    console.error('Error seeding data:', error.message);
  }
};

module.exports = seedData;
