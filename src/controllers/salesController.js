const Customer = require('../models/Customer');
const productService = require('../services/productService');
const saleService = require('../services/saleService');
const logActivity = require('../utils/historyLogger');
const Sale = require('../models/Sale');

// @desc    Record a product sale
// @route   POST /api/sales
const sellPhones = async (req, res, next) => {
  try {
    const {
      customerName,
      phoneNumber,
      customerId,
      phoneIds, // Array of product ObjectIds
      sellingPrices = {}, // { productId: manualSellingPrice }
      quantities = {}, // { productId: quantity }
      discount = 0,
      paymentType,
      paymentDetails,
      note
    } = req.body;

    if (!phoneIds || phoneIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one product is required for a sale' });
    }

    if (!paymentType) {
      return res.status(400).json({ success: false, message: 'Payment type is required' });
    }

    // Resolve customer
    let customer;
    if (customerId) {
      customer = await Customer.findById(customerId);
    } else if (customerName && phoneNumber) {
      customer = await Customer.findOne({ phone: phoneNumber });
      if (!customer) {
        customer = await Customer.create({ name: customerName, phone: phoneNumber });
      }
    }

    // Resolve products details
    const products = [];
    const itemSnapshots = [];
    let totalSellingPrice = 0;
    let totalCost = 0;

    // Generate custom Invoice Number: INV-YYYYMMDD-RAND
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${rand}`;

    for (const productId of phoneIds) {
      const product = await productService.getProductById(productId);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product not found: ${productId}` });
      }

      const qty = parseInt(quantities[productId] || 1);
      const manualPrice = sellingPrices[productId];
      
      // Look up stock
      const stockResult = await productService.getProductsWithStock({ search: '', brand: product.brand });
      const aggregatedProduct = stockResult.data.find(p => p._id.toString() === productId);
      const availableStock = aggregatedProduct ? aggregatedProduct.quantity : 0;

      if (availableStock < qty) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.brand} ${product.name}. Available: ${availableStock}, Requested: ${qty}`
        });
      }

      // Calculate selling price
      const finalSellingPrice = (manualPrice !== undefined && manualPrice !== null)
        ? parseFloat(manualPrice)
        : (product.sellingPrice || 0);

      const buyPrice = await saleService.getWeightedAverageBuyPrice(productId);

      totalSellingPrice += finalSellingPrice * qty;
      totalCost += buyPrice * qty;

      products.push({
        product,
        quantity: qty,
        sellingPrice: finalSellingPrice,
        buyPrice
      });

      itemSnapshots.push({
        phoneId: product._id, // compatibility
        productId: product._id,
        brand: product.brand,
        model: product.name, // compatibility
        name: product.name,
        storage: product.storage,
        condition: product.condition,
        quantity: qty,
        sellingPrice: finalSellingPrice,
        purchasePrice: buyPrice // compatibility
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

    // Save individual sale records for aggregation
    const createdSales = [];
    const profit = totalAmount - totalCost;

    for (const item of products) {
      const saleRecord = await saleService.createSale({
        productId: item.product._id,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        customerId: customer ? customer._id : null,
        note: note || '',
        invoiceNumber,
        paymentType,
        paymentDetails: paymentType === 'Mixed' ? paymentDetails : {
          cashAmount: paymentType === 'Cash' ? totalAmount : 0,
          cardAmount: paymentType === 'Card' ? totalAmount : 0,
          transferAmount: paymentType === 'Transfer' ? totalAmount : 0
        },
        createdBy: req.user._id
      });
      createdSales.push(saleRecord);
    }

    await logActivity({
      action: 'Phone Sold',
      details: `Sold ${products.reduce((sum, p) => sum + p.quantity, 0)} units to ${customer ? customer.name : customerName || 'Retail Customer'} - Invoice: ${invoiceNumber} (Total: $${totalAmount})`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({
      success: true,
      data: {
        _id: createdSales[0]?._id, // return first sale ID for client reference
        invoiceNumber,
        customerName: customer ? customer.name : customerName || 'Retail Customer',
        phoneNumber: customer ? customer.phone : phoneNumber || '',
        phones: itemSnapshots, // match old array structure for receipt display
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
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sales
// @route   GET /api/sales
const getSales = async (req, res, next) => {
  try {
    const rawSales = await saleService.getSales();
    
    // Group sales by invoiceNumber for chronological list
    const invoiceMap = new Map();
    for (const sale of rawSales) {
      const inv = sale.invoiceNumber;
      if (!invoiceMap.has(inv)) {
        invoiceMap.set(inv, {
          _id: sale._id,
          invoiceNumber: inv,
          customerName: sale.customerId?.name || 'Retail Customer',
          phoneNumber: sale.customerId?.phone || '',
          customer: sale.customerId,
          phones: [],
          discount: 0, // aggregate if needed or store
          totalAmount: 0,
          profit: 0,
          paymentType: sale.paymentType,
          soldBy: sale.createdBy,
          date: sale.createdAt
        });
      }

      const invData = invoiceMap.get(inv);
      invData.phones.push({
        productId: sale.productId?._id,
        brand: sale.productId?.brand,
        model: sale.productId?.name,
        storage: sale.productId?.storage,
        condition: sale.productId?.condition,
        quantity: sale.quantity,
        sellingPrice: sale.sellingPrice,
        purchasePrice: sale.buyPrice
      });
      invData.totalAmount += sale.sellingPrice * sale.quantity;
      invData.profit += (sale.sellingPrice - sale.buyPrice) * sale.quantity;
    }

    const groupedSales = Array.from(invoiceMap.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({ success: true, data: groupedSales });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sale by invoice number
// @route   GET /api/sales/:invoiceNumber
const getSaleByInvoice = async (req, res, next) => {
  try {
    const sales = await Sale.find({ invoiceNumber: req.params.invoiceNumber })
      .populate('productId')
      .populate('customerId')
      .populate('createdBy', 'name username');

    if (sales.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const first = sales[0];
    const phones = sales.map(s => ({
      productId: s.productId?._id,
      brand: s.productId?.brand,
      model: s.productId?.name,
      storage: s.productId?.storage,
      condition: s.productId?.condition,
      quantity: s.quantity,
      sellingPrice: s.sellingPrice,
      purchasePrice: s.buyPrice
    }));

    const totalAmount = sales.reduce((sum, s) => sum + (s.sellingPrice * s.quantity), 0);
    const profit = sales.reduce((sum, s) => sum + ((s.sellingPrice - s.buyPrice) * s.quantity), 0);

    res.status(200).json({
      success: true,
      data: {
        invoiceNumber: first.invoiceNumber,
        customerName: first.customerId?.name || 'Retail Customer',
        phoneNumber: first.customerId?.phone || '',
        phones,
        discount: 0,
        totalAmount,
        profit,
        paymentType: first.paymentType,
        paymentDetails: first.paymentDetails,
        soldBy: first.createdBy,
        date: first.createdAt
      }
    });
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
