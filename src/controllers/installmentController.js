const Installment = require('../models/Installment');
const Phone = require('../models/Phone');
const Accessory = require('../models/Accessory');
const PhoneSale = require('../models/PhoneSale');
const Customer = require('../models/Customer');
const logActivity = require('../utils/historyLogger');

// @desc    Get all installments with search/filter/pagination
// @route   GET /api/installments
const getInstallments = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;

    const query = {};

    // Filter by status
    if (status && ['Active', 'PaidOff', 'Overdue'].includes(status)) {
      query.status = status;
    }

    // Search by customer name, phone, or item name
    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { 'items.name': searchRegex },
        { 'items.imei': searchRegex }
      ];
    }

    // Check and update overdue status before returning
    const now = new Date();
    await Installment.updateMany(
      {
        status: 'Active',
        nextPaymentDate: { $lt: now }
      },
      { $set: { status: 'Overdue' } }
    );

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [installments, total] = await Promise.all([
      Installment.find(query)
        .populate('createdBy', 'name username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Installment.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: installments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get installment by ID
// @route   GET /api/installments/:id
const getInstallmentById = async (req, res, next) => {
  try {
    const installment = await Installment.findById(req.params.id)
      .populate('createdBy', 'name username')
      .populate('customer', 'name phone');

    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment not found' });
    }

    // Check overdue status
    const now = new Date();
    if (installment.status === 'Active' && installment.nextPaymentDate < now) {
      installment.status = 'Overdue';
      await installment.save();
    }

    res.status(200).json({ success: true, data: installment });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new installment sale
// @route   POST /api/installments
const createInstallment = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      phoneIds = [],
      sellingPrices = {},    // { phoneId: manualSellingPrice } - manually entered prices
      accessoryItems = [],   // [{ accessoryId, quantity }]
      initialPayment = 0,
      numberOfMonths,
      firstPaymentDate,
      notes,
      discount = 0
    } = req.body;

    if (!customerName || !customerPhone) {
      return res.status(400).json({ success: false, message: 'Customer name and phone are required' });
    }

    if (!numberOfMonths || numberOfMonths < 1) {
      return res.status(400).json({ success: false, message: 'Number of months must be at least 1' });
    }

    if (!firstPaymentDate) {
      return res.status(400).json({ success: false, message: 'First payment date is required' });
    }

    if (phoneIds.length === 0 && accessoryItems.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one phone or accessory is required' });
    }

    // Resolve or create customer
    let customer;
    customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) {
      customer = await Customer.create({ name: customerName, phone: customerPhone });
    }

    // Resolve phones
    const items = [];
    const phoneSnapshots = [];
    let totalSellingPrice = 0;

    if (phoneIds.length > 0) {
      const phones = await Phone.find({ _id: { $in: phoneIds } });
      if (phones.length !== phoneIds.length) {
        return res.status(400).json({ success: false, message: 'One or more selected phones are invalid' });
      }

      const outOfStock = phones.filter(p => p.status !== 'In Stock');
      if (outOfStock.length > 0) {
        const names = outOfStock.map(p => `${p.brand} ${p.model} (IMEI: ${p.imei1})`).join(', ');
        return res.status(400).json({
          success: false,
          message: `The following phones are not available: ${names}`
        });
      }

      for (const phone of phones) {
        const manualPrice = sellingPrices[phone._id.toString()];
        const finalSellingPrice = (manualPrice !== undefined && manualPrice !== null)
          ? parseFloat(manualPrice)
          : phone.sellingPrice;

        totalSellingPrice += finalSellingPrice;
        items.push({
          itemType: 'Phone',
          itemId: phone._id,
          name: `${phone.brand || ''} ${phone.model || ''}`.trim() || 'Unknown Phone',
          imei: phone.imei1,
          sellingPrice: finalSellingPrice,
          purchasePrice: phone.purchasePrice
        });
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
    }

    // Resolve accessories
    if (accessoryItems.length > 0) {
      for (const accItem of accessoryItems) {
        const accessory = await Accessory.findById(accItem.accessoryId);
        if (!accessory) {
          return res.status(400).json({ success: false, message: `Accessory not found: ${accItem.accessoryId}` });
        }
        const qty = accItem.quantity || 1;
        if (accessory.quantity < qty) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for ${accessory.name}. Available: ${accessory.quantity}, Requested: ${qty}`
          });
        }
        const itemTotal = accessory.sellingPrice * qty;
        totalSellingPrice += itemTotal;
        items.push({
          itemType: 'Accessory',
          itemId: accessory._id,
          name: `${accessory.name} (x${qty})`,
          imei: null,
          sellingPrice: itemTotal,
          purchasePrice: accessory.purchasePrice * qty
        });
      }
    }

    const totalPrice = Math.max(0, totalSellingPrice - parseFloat(discount));
    const parsedInitial = parseFloat(initialPayment) || 0;

    if (parsedInitial > totalPrice) {
      return res.status(400).json({ success: false, message: 'Initial payment cannot exceed total price' });
    }

    const remainingDebt = totalPrice - parsedInitial;
    const monthlyPayment = Math.ceil((remainingDebt / parseInt(numberOfMonths)) * 100) / 100;
    const firstDate = new Date(firstPaymentDate);

    // Generate Invoice Number
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${rand}`;

    // Create PhoneSale record (for history/reports consistency)
    const totalCost = items.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);
    const profit = totalPrice - totalCost;

    const phoneSale = await PhoneSale.create({
      invoiceNumber,
      customerName: customer.name,
      phoneNumber: customer.phone,
      customer: customer._id,
      phones: phoneSnapshots,
      discount: parseFloat(discount),
      totalAmount: totalPrice,
      profit,
      paymentType: 'Installment',
      paymentDetails: {
        cashAmount: parsedInitial,
        cardAmount: 0,
        transferAmount: 0
      },
      soldBy: req.user._id,
      date: new Date()
    });

    // Update phone statuses to Sold
    if (phoneIds.length > 0) {
      await Phone.updateMany(
        { _id: { $in: phoneIds } },
        { $set: { status: 'Sold' } }
      );
    }

    // Update accessory quantities
    for (const accItem of accessoryItems) {
      const qty = accItem.quantity || 1;
      await Accessory.findByIdAndUpdate(accItem.accessoryId, {
        $inc: { quantity: -qty }
      });
    }

    // Create the installment record
    const installment = await Installment.create({
      customerName: customer.name,
      customerPhone: customer.phone,
      customer: customer._id,
      items,
      totalPrice,
      initialPayment: parsedInitial,
      remainingDebt,
      monthlyPayment,
      numberOfMonths: parseInt(numberOfMonths),
      firstPaymentDate: firstDate,
      nextPaymentDate: firstDate,
      notes: notes || '',
      status: remainingDebt <= 0 ? 'PaidOff' : 'Active',
      payments: [],
      totalPaid: parsedInitial,
      createdBy: req.user._id,
      saleId: phoneSale._id
    });

    // Log activity
    const itemNames = items.map(i => i.name).join(', ');
    await logActivity({
      action: 'Installment Sale Created',
      details: `Installment sale to ${customer.name} - ${itemNames} - Total: $${totalPrice}, Initial: $${parsedInitial}, Remaining: $${remainingDebt}, ${numberOfMonths} months - Invoice: ${invoiceNumber}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({
      success: true,
      data: {
        installment,
        invoiceNumber,
        phoneSale
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive a payment for an installment
// @route   POST /api/installments/:id/payments
const receivePayment = async (req, res, next) => {
  try {
    const { amount, date, method = 'Cash', notes = '' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    }

    const installment = await Installment.findById(req.params.id);
    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment not found' });
    }

    if (installment.status === 'PaidOff') {
      return res.status(400).json({ success: false, message: 'This installment is already fully paid' });
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount > installment.remainingDebt + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment amount ($${paymentAmount}) exceeds remaining debt ($${installment.remainingDebt})`
      });
    }

    // Add payment record
    installment.payments.push({
      amount: paymentAmount,
      date: date ? new Date(date) : new Date(),
      method,
      notes,
      receivedBy: req.user._id,
      receivedByName: req.user.name || req.user.username
    });

    // Update totals
    installment.totalPaid += paymentAmount;
    installment.remainingDebt = Math.max(0, installment.remainingDebt - paymentAmount);

    // Update status
    if (installment.remainingDebt <= 0.01) {
      installment.remainingDebt = 0;
      installment.status = 'PaidOff';
      installment.nextPaymentDate = null;
    } else {
      // Calculate next payment date (one month from current nextPaymentDate)
      const currentNext = new Date(installment.nextPaymentDate || new Date());
      const newNext = new Date(currentNext);
      newNext.setMonth(newNext.getMonth() + 1);
      installment.nextPaymentDate = newNext;

      // Check if overdue
      if (newNext < new Date()) {
        installment.status = 'Overdue';
      } else {
        installment.status = 'Active';
      }
    }

    await installment.save();

    // Log activity
    await logActivity({
      action: 'Installment Payment Received',
      details: `Received $${paymentAmount} from ${installment.customerName} (${method}). Remaining: $${installment.remainingDebt}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, data: installment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get installment dashboard statistics
// @route   GET /api/installments/stats
const getInstallmentStats = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Update overdue statuses
    await Installment.updateMany(
      { status: 'Active', nextPaymentDate: { $lt: now } },
      { $set: { status: 'Overdue' } }
    );

    // Active installments count
    const activeInstallments = await Installment.countDocuments({ status: 'Active' });

    // Overdue installments count
    const overdueInstallments = await Installment.countDocuments({ status: 'Overdue' });

    // Total remaining debt (active + overdue)
    const debtAgg = await Installment.aggregate([
      { $match: { status: { $in: ['Active', 'Overdue'] } } },
      { $group: { _id: null, total: { $sum: '$remainingDebt' } } }
    ]);
    const totalInstallmentDebt = debtAgg[0]?.total || 0;

    // Today's installment payments
    const todayPaymentsAgg = await Installment.aggregate([
      { $unwind: '$payments' },
      { $match: { 'payments.date': { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } }
    ]);
    const todayInstallmentPayments = todayPaymentsAgg[0]?.total || 0;

    // This month's collected amount
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthPaymentsAgg = await Installment.aggregate([
      { $unwind: '$payments' },
      { $match: { 'payments.date': { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } }
    ]);
    const monthlyCollected = monthPaymentsAgg[0]?.total || 0;

    // Payments due today
    const dueTodayCount = await Installment.countDocuments({
      status: { $in: ['Active', 'Overdue'] },
      nextPaymentDate: { $gte: todayStart, $lte: todayEnd }
    });

    res.status(200).json({
      success: true,
      data: {
        activeInstallments,
        overdueInstallments,
        totalInstallmentDebt,
        todayInstallmentPayments,
        monthlyCollected,
        dueTodayCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get installment report data
// @route   GET /api/installments/report
const getInstallmentReport = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;

    const query = {};
    if (status && ['Active', 'PaidOff', 'Overdue'].includes(status)) {
      query.status = status;
    }
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const installments = await Installment.find(query)
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });

    // Summary stats
    const totalCount = installments.length;
    const activeCount = installments.filter(i => i.status === 'Active').length;
    const paidOffCount = installments.filter(i => i.status === 'PaidOff').length;
    const overdueCount = installments.filter(i => i.status === 'Overdue').length;
    const totalDebt = installments.reduce((sum, i) => sum + i.remainingDebt, 0);
    const totalCollected = installments.reduce((sum, i) => sum + i.totalPaid, 0);
    const totalValue = installments.reduce((sum, i) => sum + i.totalPrice, 0);

    res.status(200).json({
      success: true,
      data: installments,
      summary: {
        totalCount,
        activeCount,
        paidOffCount,
        overdueCount,
        totalDebt,
        totalCollected,
        totalValue
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInstallments,
  getInstallmentById,
  createInstallment,
  receivePayment,
  getInstallmentStats,
  getInstallmentReport
};
