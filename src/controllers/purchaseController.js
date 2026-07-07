const PhonePurchase = require('../models/PhonePurchase');
const Phone = require('../models/Phone');
const Supplier = require('../models/Supplier');
const logActivity = require('../utils/historyLogger');

// @desc    Receive phones (record new purchase invoice)
// @route   POST /api/purchases
const receivePhones = async (req, res, next) => {
  try {
    const { supplierId, supplierName, invoiceNumber, customerName, customerPhone, phones, notes } = req.body;

    const isBuyback = !!(customerName && customerPhone);

    if (!isBuyback && (!invoiceNumber || (!supplierId && !supplierName))) {
      return res.status(400).json({ success: false, message: 'Supplier/Invoice details or Customer Buyback details are required' });
    }

    if (!phones || phones.length === 0) {
      return res.status(400).json({ success: false, message: 'Phones list is required' });
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
    const phoneInstances = [];

    // Loop through phones to validate details and calculate total
    for (const phoneItem of phones) {
      const {
        imei1, imei2, model, purchasePrice, sellingPrice, condition, storage, color, clientName, clientPhone
      } = phoneItem;

      if (!imei1 || !model || !purchasePrice) {
        return res.status(400).json({
          success: false,
          message: `Each phone must have imei1, model, and purchasePrice`
        });
      }

      // Check if IMEI already exists
      const existingPhone = await Phone.findOne({ imei1 });

      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: `Phone with IMEI ${imei1} already exists in inventory`
        });
      }

      totalAmount += parseFloat(purchasePrice);
      phoneInstances.push({
        model,
        imei1,
        imei2: imei2 || '',
        purchasePrice: parseFloat(purchasePrice),
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : 0,
        condition: condition || 'Used',
        storage: storage || '',
        color: color || '',
        clientName: isBuyback ? customerName : (clientName || ''),
        clientPhone: isBuyback ? customerPhone : (clientPhone || ''),
        supplier: isBuyback ? null : supplier._id,
        purchaseInvoiceNumber: isBuyback ? 'BUYBACK' : invoiceNumber,
        status: 'In Stock'
      });
    }

    // Create the Phone purchase history document
    const phonePurchaseObj = await PhonePurchase.create({
      supplier: isBuyback ? null : supplier._id,
      invoiceNumber: isBuyback ? 'BUYBACK' : invoiceNumber,
      customerName: isBuyback ? customerName : '',
      customerPhone: isBuyback ? customerPhone : '',
      phones: phoneInstances,
      totalAmount,
      notes: notes || '',
      createdBy: req.user._id
    });

    // Bulk insert phone inventory
    const createdPhones = await Phone.insertMany(phoneInstances);

    // Update Supplier outstanding balance (only if supplier invoice purchase)
    if (!isBuyback && supplier) {
      supplier.balance -= totalAmount; // negative balance indicates debt to supplier
      await supplier.save();
    }

    await logActivity({
      action: isBuyback ? 'Phone Buyback' : 'Phone Added',
      details: isBuyback
        ? `Bought back ${createdPhones.length} phones from customer ${customerName} (Total paid: ${totalAmount})`
        : `Received purchase invoice ${invoiceNumber} from ${supplier.name}: Added ${createdPhones.length} phones (Total cost: ${totalAmount})`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({
      success: true,
      data: phonePurchaseObj,
      phonesCreated: createdPhones.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all phone purchase logs
// @route   GET /api/purchases
const getPurchases = async (req, res, next) => {
  try {
    const purchases = await PhonePurchase.find()
      .populate('supplier', 'name')
      .sort({ date: -1 });
    res.status(200).json({ success: true, data: purchases });
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
