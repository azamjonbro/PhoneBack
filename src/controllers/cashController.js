const MoneyReceipt = require('../models/MoneyReceipt');
const MoneyPayment = require('../models/MoneyPayment');
const Expense = require('../models/Expense');
const logActivity = require('../utils/historyLogger');

// ==========================================
// RECEIVE MONEY (CASH IN)
// ==========================================

const receiveMoney = async (req, res, next) => {
  try {
    const { amount, reason, customer, description, date } = req.body;
    if (!amount || !reason) {
      return res.status(400).json({ success: false, message: 'Amount and reason are required' });
    }

    const receipt = await MoneyReceipt.create({
      amount: parseFloat(amount),
      reason,
      customer,
      description,
      date: date || new Date()
    });

    await logActivity({
      action: 'Money Received',
      details: `Received Cash: ${amount} from ${customer || 'Unknown'} for ${reason}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

const getReceipts = async (req, res, next) => {
  try {
    const { search, startDate, endDate } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { customer: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const receipts = await MoneyReceipt.find(query).sort({ date: -1 });

    // Aggregate Daily and Monthly Totals
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyTotalAgg = await MoneyReceipt.aggregate([
      { $match: { date: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyTotalAgg = await MoneyReceipt.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      dailyTotal: dailyTotalAgg[0]?.total || 0,
      monthlyTotal: monthlyTotalAgg[0]?.total || 0,
      data: receipts
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PAY MONEY (CASH OUT)
// ==========================================

const payMoney = async (req, res, next) => {
  try {
    const { amount, supplier, reason, description, date } = req.body;
    if (!amount || !reason) {
      return res.status(400).json({ success: false, message: 'Amount and reason are required' });
    }

    const payment = await MoneyPayment.create({
      amount: parseFloat(amount),
      supplier,
      reason,
      description,
      date: date || new Date()
    });

    await logActivity({
      action: 'Money Paid',
      details: `Paid Cash: ${amount} to ${supplier || 'Unknown'} for ${reason}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const { search, startDate, endDate } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const payments = await MoneyPayment.find(query).sort({ date: -1 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyTotalAgg = await MoneyPayment.aggregate([
      { $match: { date: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyTotalAgg = await MoneyPayment.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      dailyTotal: dailyTotalAgg[0]?.total || 0,
      monthlyTotal: monthlyTotalAgg[0]?.total || 0,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPENSES
// ==========================================

const createExpense = async (req, res, next) => {
  try {
    const { category, amount, description, date } = req.body;
    if (!category || !amount) {
      return res.status(400).json({ success: false, message: 'Category and amount are required' });
    }

    const expense = await Expense.create({
      category,
      amount: parseFloat(amount),
      description,
      createdBy: req.user._id,
      date: date || new Date()
    });

    await logActivity({
      action: 'Expense Added',
      details: `Logged Expense: ${amount} for ${category} (${description || 'No description'})`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const { category, search, startDate, endDate } = req.query;
    const query = {};

    if (category) query.category = category;
    if (search) query.description = { $regex: search, $options: 'i' };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('createdBy', 'name username')
      .sort({ date: -1 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Totals
    const dailyTotalAgg = await Expense.aggregate([
      { $match: { date: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyTotalAgg = await Expense.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Categories Breakdown
    const categoryTotals = await Expense.aggregate([
      { $match: query },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      dailyTotal: dailyTotalAgg[0]?.total || 0,
      monthlyTotal: monthlyTotalAgg[0]?.total || 0,
      categoryTotals: categoryTotals.reduce((acc, curr) => {
        acc[curr._id] = curr.total;
        return acc;
      }, {}),
      data: expenses
    });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await expense.deleteOne();

    await logActivity({
      action: 'Inventory Updated', // standard mapping
      details: `Removed Expense: ${expense.amount} for ${expense.category}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  receiveMoney,
  getReceipts,
  payMoney,
  getPayments,
  createExpense,
  getExpenses,
  deleteExpense
};
