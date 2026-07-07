const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Phone = require('../models/Phone');
const Accessory = require('../models/Accessory');
const Setting = require('../models/Setting');
const Expense = require('../models/Expense');
const MoneyReceipt = require('../models/MoneyReceipt');
const MoneyPayment = require('../models/MoneyPayment');
const PhoneSale = require('../models/PhoneSale');
const PhonePurchase = require('../models/PhonePurchase');
const History = require('../models/History');
const Installment = require('../models/Installment');

const seedData = async () => {
  try {
    console.log('Clearing database and recreating indexes to avoid duplicate key issues...');

    // Drop all data across all collections
    await User.deleteMany({});
    await Supplier.deleteMany({});
    await Customer.deleteMany({});
    await Phone.deleteMany({});
    await Accessory.deleteMany({});
    await Setting.deleteMany({});
    await Expense.deleteMany({});
    await MoneyReceipt.deleteMany({});
    await MoneyPayment.deleteMany({});
    await PhoneSale.deleteMany({});
    await PhonePurchase.deleteMany({});
    await History.deleteMany({});
    await Installment.deleteMany({});

    // Drop indexes of major collections to remove old/incorrect unique indexes (e.g. serialNumber unique constraint)
    const dropIndexSafely = async (model) => {
      try {
        await model.collection.dropIndexes();
      } catch (err) {
        // Ignored if collection does not exist or has no indexes to drop
      }
    };

    await dropIndexSafely(Phone);
    await dropIndexSafely(Accessory);
    await dropIndexSafely(Customer);
    await dropIndexSafely(PhoneSale);
    await dropIndexSafely(PhonePurchase);
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

    // 4. Create 15 Demo Customers with Uzbekistan Phone Numbers
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
      { name: 'Lobar Hoshimova', phone: '+998959876510', email: 'lobar@mail.uz', balance: 0 },
      { name: 'Bekzod Toshpulotov', phone: '+998979876511', email: 'bekzod@mail.uz', balance: 0 },
      { name: 'Kamola Ganiyeva', phone: '+998999876512', email: 'kamola@mail.uz', balance: 0 },
      { name: 'Diyorbek Isaev', phone: '+998901112233', email: 'diyor@mail.uz', balance: 0 },
      { name: 'Asal Axmedova', phone: '+998934445566', email: 'asal@mail.uz', balance: 0 },
      { name: 'Ulugbek Yuldashev', phone: '+998947778899', email: 'ulugbek@mail.uz', balance: 0 }
    ];

    const customers = [];
    for (const c of customerData) {
      const created = await Customer.create(c);
      customers.push(created);
    }

    // 5. Create Phones (10 Required Models + some sold ones)
    // iPhone 13 128GB
    const p1 = await Phone.create({
      brand: 'Apple', model: 'iPhone 13', color: 'Midnight', storage: '128GB', ram: '4GB',
      imei1: '358972109847001', imei2: '358972109847002', serialNumber: 'SN-IP13-001',
      purchasePrice: 520, sellingPrice: 650, supplier: appleSupplier._id, status: 'In Stock',
      condition: 'Used', purchaseInvoiceNumber: 'PINV-APP-01'
    });

    // iPhone 14 Pro 128GB
    const p2 = await Phone.create({
      brand: 'Apple', model: 'iPhone 14 Pro', color: 'Deep Purple', storage: '128GB', ram: '6GB',
      imei1: '358972109847003', imei2: '358972109847004', serialNumber: 'SN-IP14P-002',
      purchasePrice: 780, sellingPrice: 950, supplier: appleSupplier._id, status: 'In Stock',
      condition: 'Used', purchaseInvoiceNumber: 'PINV-APP-01'
    });

    // iPhone 15 Pro Max 256GB
    const p3 = await Phone.create({
      brand: 'Apple', model: 'iPhone 15 Pro Max', color: 'Titanium Blue', storage: '256GB', ram: '8GB',
      imei1: '358972109847005', imei2: '358972109847006', serialNumber: 'SN-IP15PM-003',
      purchasePrice: 1050, sellingPrice: 1250, supplier: appleSupplier._id, status: 'In Stock',
      condition: 'New', purchaseInvoiceNumber: 'PINV-APP-02'
    });

    // Samsung S24 Ultra
    const p4 = await Phone.create({
      brand: 'Samsung', model: 'Galaxy S24 Ultra', color: 'Titanium Yellow', storage: '512GB', ram: '12GB',
      imei1: '357123984576001', imei2: '357123984576002', serialNumber: 'SN-S24U-001',
      purchasePrice: 980, sellingPrice: 1200, supplier: samsungSupplier._id, status: 'In Stock',
      condition: 'New', purchaseInvoiceNumber: 'PINV-SAM-01'
    });

    // Samsung A55
    const p5 = await Phone.create({
      brand: 'Samsung', model: 'Galaxy A55', color: 'Awesome Iceblue', storage: '128GB', ram: '8GB',
      imei1: '357123984576003', imei2: '357123984576004', serialNumber: 'SN-A55-002',
      purchasePrice: 310, sellingPrice: 390, supplier: samsungSupplier._id, status: 'In Stock',
      condition: 'New', purchaseInvoiceNumber: 'PINV-SAM-01'
    });

    // Redmi Note 14 Pro
    const p6 = await Phone.create({
      brand: 'Redmi', model: 'Note 14 Pro', color: 'Forest Green', storage: '256GB', ram: '8GB',
      imei1: '359123456789001', imei2: '359123456789002', serialNumber: 'SN-RN14P-001',
      purchasePrice: 240, sellingPrice: 310, supplier: genericSupplier._id, status: 'In Stock',
      condition: 'New', purchaseInvoiceNumber: 'PINV-GEN-01'
    });

    // Redmi 13
    const p7 = await Phone.create({
      brand: 'Redmi', model: '13', color: 'Ocean Blue', storage: '128GB', ram: '6GB',
      imei1: '359123456789003', imei2: '359123456789004', serialNumber: 'SN-R13-002',
      purchasePrice: 130, sellingPrice: 170, supplier: genericSupplier._id, status: 'In Stock',
      condition: 'New', purchaseInvoiceNumber: 'PINV-GEN-01'
    });

    // Poco X7 Pro
    const p8 = await Phone.create({
      brand: 'Poco', model: 'X7 Pro', color: 'Poco Yellow', storage: '256GB', ram: '12GB',
      imei1: '359123456789005', imei2: '359123456789006', serialNumber: 'SN-PX7P-001',
      purchasePrice: 290, sellingPrice: 360, supplier: genericSupplier._id, status: 'In Stock',
      condition: 'New', purchaseInvoiceNumber: 'PINV-GEN-02'
    });

    // Honor X9
    const p9 = await Phone.create({
      brand: 'Honor', model: 'X9', color: 'Midnight Black', storage: '128GB', ram: '8GB',
      imei1: '355432109876001', imei2: '355432109876002', serialNumber: 'SN-HX9-001',
      purchasePrice: 190, sellingPrice: 240, supplier: genericSupplier._id, status: 'In Stock',
      condition: 'Used', purchaseInvoiceNumber: 'PINV-GEN-02'
    });

    // Google Pixel 9
    const p10 = await Phone.create({
      brand: 'Google', model: 'Pixel 9', color: 'Obsidian', storage: '128GB', ram: '12GB',
      imei1: '353456789012001', imei2: '353456789012002', serialNumber: 'SN-GP9-001',
      purchasePrice: 650, sellingPrice: 800, supplier: genericSupplier._id, status: 'In Stock',
      condition: 'New', purchaseInvoiceNumber: 'PINV-GEN-03'
    });

    // Additional phones to represent SOLD status in history
    const soldPhone1 = await Phone.create({
      brand: 'Apple', model: 'iPhone 13 Pro', color: 'Sierra Blue', storage: '256GB', ram: '6GB',
      imei1: '358972109847901', imei2: '358972109847902', serialNumber: 'SN-IP13P-SOLD1',
      purchasePrice: 680, sellingPrice: 820, supplier: appleSupplier._id, status: 'Sold',
      condition: 'Used', purchaseInvoiceNumber: 'PINV-APP-01'
    });

    const soldPhone2 = await Phone.create({
      brand: 'Samsung', model: 'Galaxy S23 Ultra', color: 'Green', storage: '256GB', ram: '12GB',
      imei1: '357123984576901', imei2: '357123984576902', serialNumber: 'SN-S23U-SOLD2',
      purchasePrice: 820, sellingPrice: 970, supplier: samsungSupplier._id, status: 'Sold',
      condition: 'Used', purchaseInvoiceNumber: 'PINV-SAM-01'
    });

    const soldPhone3 = await Phone.create({
      brand: 'Apple', model: 'iPhone 14 Pro Max', color: 'Space Black', storage: '256GB', ram: '6GB',
      imei1: '358972109847903', imei2: '358972109847904', serialNumber: 'SN-IP14PM-SOLD3',
      purchasePrice: 900, sellingPrice: 1100, supplier: appleSupplier._id, status: 'Sold',
      condition: 'Used', purchaseInvoiceNumber: 'PINV-APP-02'
    });

    // 6. Create Accessories (Charger, Adapter, Type-C Cable, Lightning Cable, Glass, Case, AirPods, Power Bank, Smart Watch)
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

    // 7. Seed Past Sales History (PhoneSale)
    const today = new Date();
    
    // Invoices
    const sale1 = await PhoneSale.create({
      invoiceNumber: 'INV-20260703-1001',
      customerName: customers[0].name,
      phoneNumber: customers[0].phone,
      customer: customers[0]._id,
      phones: [{
        phoneId: soldPhone1._id,
        brand: 'Apple',
        model: 'iPhone 13 Pro',
        color: 'Sierra Blue',
        storage: '256GB',
        ram: '6GB',
        imei1: '358972109847901',
        serialNumber: 'SN-IP13P-SOLD1',
        sellingPrice: 820,
        purchasePrice: 680
      }],
      discount: 20,
      totalAmount: 800,
      profit: 120, // 800 - 680
      paymentType: 'Cash',
      paymentDetails: { cashAmount: 800, cardAmount: 0, transferAmount: 0 },
      soldBy: employeeUser._id,
      date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000)
    });

    const sale2 = await PhoneSale.create({
      invoiceNumber: 'INV-20260705-1002',
      customerName: customers[1].name,
      phoneNumber: customers[1].phone,
      customer: customers[1]._id,
      phones: [{
        phoneId: soldPhone2._id,
        brand: 'Samsung',
        model: 'Galaxy S23 Ultra',
        color: 'Green',
        storage: '256GB',
        ram: '12GB',
        imei1: '357123984576901',
        serialNumber: 'SN-S23U-SOLD2',
        sellingPrice: 970,
        purchasePrice: 820
      }],
      discount: 0,
      totalAmount: 970,
      profit: 150, // 970 - 820
      paymentType: 'Card',
      paymentDetails: { cashAmount: 0, cardAmount: 970, transferAmount: 0 },
      soldBy: employeeUser._id,
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
    });

    // 8. Seed Purchase History (PhonePurchase)
    await PhonePurchase.create({
      supplier: appleSupplier._id,
      invoiceNumber: 'PINV-APP-01',
      totalAmount: 1980, // 520 (p1) + 780 (p2) + 680 (soldPhone1)
      notes: 'Initial Apple batch',
      createdBy: adminUser._id,
      date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
    });

    await PhonePurchase.create({
      supplier: samsungSupplier._id,
      invoiceNumber: 'PINV-SAM-01',
      totalAmount: 2110, // 980 (p4) + 310 (p5) + 820 (soldPhone2)
      notes: 'Initial Samsung batch',
      createdBy: adminUser._id,
      date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000)
    });

    // 9. Seed Installments (Active, Overdue, PaidOff)
    const firstPaymentBase = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Installment 1: Active
    const installment1_firstDate = new Date(firstPaymentBase.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const installment1_nextDate = new Date(installment1_firstDate);
    installment1_nextDate.setMonth(installment1_nextDate.getMonth() + 1); // 15 days from now

    await Installment.create({
      customerName: customers[2].name,
      customerPhone: customers[2].phone,
      customer: customers[2]._id,
      items: [{
        itemType: 'Phone',
        itemId: soldPhone3._id,
        name: 'Apple iPhone 14 Pro Max',
        imei: '358972109847903',
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
      totalPaid: 500, // 300 initial + 200 payment
      createdBy: employeeUser._id
    });

    // Installment 2: Overdue (next payment date was 5 days ago, status is Overdue)
    const installment2_firstDate = new Date(firstPaymentBase.getTime() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
    const installment2_nextDate = new Date(installment2_firstDate);
    installment2_nextDate.setMonth(installment2_nextDate.getMonth() + 1); // was due 5 days ago

    await Installment.create({
      customerName: customers[3].name,
      customerPhone: customers[3].phone,
      customer: customers[3]._id,
      items: [{
        itemType: 'Phone',
        itemId: p2._id, // link to an existing phone (just simulated as sold for modeling purposes)
        name: 'Apple iPhone 14 Pro',
        imei: '358972109847003',
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
    const installment3_firstDate = new Date(firstPaymentBase.getTime() - 95 * 24 * 60 * 60 * 1000); // 95 days ago

    await Installment.create({
      customerName: customers[4].name,
      customerPhone: customers[4].phone,
      customer: customers[4]._id,
      items: [{
        itemType: 'Phone',
        itemId: p1._id,
        name: 'Apple iPhone 13',
        imei: '358972109847001',
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

    // 11. Seed Cash In/Out transactions (MoneyReceipt / MoneyPayment)
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
