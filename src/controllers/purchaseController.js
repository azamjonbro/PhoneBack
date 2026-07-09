const Supplier = require('../models/Supplier');
const productService = require('../services/productService');
const inventoryService = require('../services/inventoryService');
const logActivity = require('../utils/historyLogger');

// @desc    Receive phones (record new purchase invoice / entries)
// @route   POST /api/purchases
const receivePhones = async (req, res, next) => {
  try {
    const { supplierId, supplierName, invoiceNumber, customerName, customerPhone, phones, notes } = req.body;

    const isBuyback = !!(customerName && customerPhone);

    if (!isBuyback && (!invoiceNumber || (!supplierId && !supplierName))) {
      return res.status(400).json({ success: false, message: 'Supplier/Invoice details or Customer Buyback details are required' });
    }

    if (!phones || phones.length === 0) {
      return res.status(400).json({ success: false, message: 'Products list is required' });
    }

    // Resolve or find supplier (only if not buyback)
    let supplier;
    if (!isBuyback) {
      if (supplierId) {
        supplier = await Supplier.findById(supplierId);
      } else if (supplierName) {
        supplier = await Supplier.findOne({ name: supplierName });
        if (!supplier) {
          supplier = await Supplier.create({ name: supplierName });
        }
      }
      if (!supplier) {
        return res.status(400).json({ success: false, message: 'Supplier could not be resolved' });
      }
    }

    let totalAmount = 0;
    const entriesCreated = [];

    // Loop through phones to validate details and calculate total
    for (const item of phones) {
      const {
        model, brand = 'Generic', purchasePrice, condition = 'Used', storage = '', quantity = 1, note = ''
      } = item;

      if (!model || !purchasePrice || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Each item must have model (product name), purchasePrice, and a valid quantity`
        });
      }

      // 1. Get or Create Product
      const product = await productService.createOrGetProduct({
        name: model,
        brand,
        storage,
        condition
      });

      // 2. Create Inventory Entry
      const entry = await inventoryService.createEntry({
        productId: product._id,
        quantity: parseInt(quantity),
        buyPrice: parseFloat(purchasePrice),
        supplierId: isBuyback ? null : supplier?._id,
        note: note || notes || '',
        createdBy: req.user._id
      });

      totalAmount += parseFloat(purchasePrice) * parseInt(quantity);
      entriesCreated.push(entry);
    }

    // Update Supplier outstanding balance (only if supplier invoice purchase)
    if (!isBuyback && supplier) {
      supplier.balance -= totalAmount; // negative balance indicates debt to supplier
      await supplier.save();
    }

    await logActivity({
      action: isBuyback ? 'Phone Buyback' : 'Phone Added',
      details: isBuyback
        ? `Bought back products from customer ${customerName} (Total paid: $${totalAmount})`
        : `Received purchase invoice ${invoiceNumber} from ${supplier.name}: Added ${entriesCreated.length} product lines (Total cost: $${totalAmount})`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({
      success: true,
      data: {
        supplier: isBuyback ? null : supplier?._id,
        invoiceNumber: isBuyback ? 'BUYBACK' : invoiceNumber,
        customerName: isBuyback ? customerName : '',
        customerPhone: isBuyback ? customerPhone : '',
        totalAmount,
        notes: notes || '',
        createdBy: req.user._id
      },
      phonesCreated: entriesCreated.reduce((sum, e) => sum + e.quantity, 0)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all phone purchase logs (aggregated from InventoryEntries)
// @route   GET /api/purchases
const getPurchases = async (req, res, next) => {
  try {
    const entries = await inventoryService.getEntriesByProduct();
    // We can group entries by date or format them for the UI
    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Suppliers
// @route   GET /api/purchases/suppliers
const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Supplier
// @route   POST /api/purchases/suppliers
const createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, email } = req.body;
    const existing = await Supplier.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Supplier with this name already exists' });
    }
    const supplier = await Supplier.create({ name, contactPerson, phone, email });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  receivePhones,
  getPurchases,
  getSuppliers,
  createSupplier
};
