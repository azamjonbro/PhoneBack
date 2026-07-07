const PhoneSale = require('../models/PhoneSale');
const Phone = require('../models/Phone');
const Customer = require('../models/Customer');
const logActivity = require('../utils/historyLogger');

// @desc    Record a phone sale
// @route   POST /api/sales
const sellPhones = async (req, res, next) => {
  try {
    const {
      customerName,
      phoneNumber,
      customerId,
      phoneIds, // Array of phone Mongo ObjectIds
      sellingPrices = {}, // { phoneId: manualSellingPrice } - manually entered prices
      discount = 0,
      paymentType,
      paymentDetails // { cashAmount, cardAmount, transferAmount }
    } = req.body;

    if (!phoneIds || phoneIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one phone is required for a sale' });
    }

    if (!paymentType) {
      return res.status(400).json({ success: false, message: 'Payment type is required' });
    }

    // Find and resolve customer
    let customer;
    if (customerId) {
      customer = await Customer.findById(customerId);
    } else if (customerName && phoneNumber) {
      customer = await Customer.findOne({ phone: phoneNumber });
      if (!customer) {
        customer = await Customer.create({ name: customerName, phone: phoneNumber });
      }
    }

    // Resolve details of the phones being sold
    const phones = await Phone.find({ _id: { $in: phoneIds } });
    if (phones.length !== phoneIds.length) {
      return res.status(400).json({ success: false, message: 'One or more selected phones are invalid' });
    }

    // Verify all selected phones are In Stock
    const outOfStockPhones = phones.filter(p => p.status !== 'In Stock');
    if (outOfStockPhones.length > 0) {
      const names = outOfStockPhones.map(p => `${p.brand} ${p.model} (IMEI: ${p.imei1})`).join(', ');
      return res.status(400).json({
        success: false,
        message: `The following phones are already sold or reserved: ${names}`
      });
    }

    // Calculate invoice totals using MANUALLY entered selling prices
    let totalSellingPrice = 0;
    const phoneSnapshots = [];

    for (const phone of phones) {
      // Use manually entered price if provided, otherwise fall back to inventory price
      const manualPrice = sellingPrices[phone._id.toString()];
      const finalSellingPrice = (manualPrice !== undefined && manualPrice !== null) 
        ? parseFloat(manualPrice) 
        : phone.sellingPrice;

      totalSellingPrice += finalSellingPrice;
      phoneSnapshots.push({
        phoneId: phone._id,
        brand: phone.brand,
        model: phone.model,
        color: phone.color,
        storage: phone.storage,
        ram: phone.ram,
        imei1: phone.imei1,
        serialNumber: phone.serialNumber,
        sellingPrice: finalSellingPrice,
        purchasePrice: phone.purchasePrice
      });
    }

    const totalAmount = Math.max(0, totalSellingPrice - parseFloat(discount));

    // Check mixed payment matching
    if (paymentType === 'Mixed') {
      const { cashAmount = 0, cardAmount = 0, transferAmount = 0 } = paymentDetails || {};
      const totalPaid = parseFloat(cashAmount) + parseFloat(cardAmount) + parseFloat(transferAmount);
      if (Math.abs(totalPaid - totalAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `For mixed payment, total paid (${totalPaid}) must match the net amount (${totalAmount})`
        });
      }
    }

    // Generate custom Invoice Number: INV-YYYYMMDD-RAND
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${rand}`;

    // Create the Sale record
    const totalCost = phoneSnapshots.reduce((sum, p) => sum + (p.purchasePrice || 0), 0);
    const profit = totalAmount - totalCost;

    const phoneSale = await PhoneSale.create({
      invoiceNumber,
      customerName: customer ? customer.name : customerName,
      phoneNumber: customer ? customer.phone : phoneNumber,
      customer: customer ? customer._id : null,
      phones: phoneSnapshots,
      discount: parseFloat(discount),
      totalAmount,
      profit,
      paymentType,
      paymentDetails: paymentType === 'Mixed' ? paymentDetails : {
        cashAmount: paymentType === 'Cash' ? totalAmount : 0,
        cardAmount: paymentType === 'Card' ? totalAmount : 0,
        transferAmount: paymentType === 'Transfer' ? totalAmount : 0
      },
      soldBy: req.user._id,
      date: new Date()
    });

    // Update phone statuses to 'Sold'
    await Phone.updateMany(
      { _id: { $in: phoneIds } },
      { $set: { status: 'Sold' } }
    );

    // Audit logs
    await logActivity({
      action: 'Phone Sold',
      details: `Sold ${phones.length} phones to ${customer ? customer.name : customerName || 'Retail Customer'} - Invoice: ${invoiceNumber} (Total: ${totalAmount})`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({
      success: true,
      data: phoneSale
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all phone sales
// @route   GET /api/sales
const getSales = async (req, res, next) => {
  try {
    const sales = await PhoneSale.find()
      .populate('soldBy', 'name username')
      .populate('customer', 'name phone')
      .sort({ date: -1 });
    res.status(200).json({ success: true, data: sales });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sale by invoice number
// @route   GET /api/sales/:invoiceNumber
const getSaleByInvoice = async (req, res, next) => {
  try {
    const sale = await PhoneSale.findOne({ invoiceNumber: req.params.invoiceNumber })
      .populate('soldBy', 'name username')
      .populate('customer', 'name phone');
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all customers
// @route   GET /api/sales/customers
const getCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Customer
// @route   POST /api/sales/customers
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    const customer = await Customer.create({ name, phone, email });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sellPhones,
  getSales,
  getSaleByInvoice,
  getCustomers,
  createCustomer
};
