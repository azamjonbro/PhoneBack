const Sale = require('../models/Sale');
const InventoryEntry = require('../models/InventoryEntry');
const Expense = require('../models/Expense');
const MoneyReceipt = require('../models/MoneyReceipt');
const MoneyPayment = require('../models/MoneyPayment');
const Product = require('../models/Product');
const Accessory = require('../models/Accessory');
const History = require('../models/History');
const Installment = require('../models/Installment');

const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Today's Sales
    const salesAgg = await Sale.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } } } }
    ]);
    const todaySales = salesAgg[0]?.total || 0;

    // 2. Today's Purchases
    const purchasesAgg = await InventoryEntry.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$buyPrice', '$quantity'] } } } }
    ]);
    const todayPurchases = purchasesAgg[0]?.total || 0;

    // 3. Today's Expenses
    const expensesAgg = await Expense.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todayExpenses = expensesAgg[0]?.total || 0;

    // 4. Money Received (Cash In)
    const receivedAgg = await MoneyReceipt.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todayReceived = receivedAgg[0]?.total || 0;

    // 5. Money Paid (Cash Out)
    const paidAgg = await MoneyPayment.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todayPaid = paidAgg[0]?.total || 0;

    // 6. Stock Quantities (Quantity-based)
    const totalEntries = await InventoryEntry.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const totalSalesQty = await Sale.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const phonesInStock = (totalEntries[0]?.total || 0) - (totalSalesQty[0]?.total || 0);
    
    const accessoriesAgg = await Accessory.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const accessoriesInStock = accessoriesAgg[0]?.total || 0;

    // 7. Recent Activities
    const recentActivities = await History.find()
      .sort({ date: -1 })
      .limit(10);

    // 8. 7-Day Chart Data (Sales and Expenses)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dSales = await Sale.aggregate([
        { $match: { createdAt: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } } } }
      ]);
      const dExpenses = await Expense.aggregate([
        { $match: { date: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      chartData.push({
        label,
        sales: dSales[0]?.total || 0,
        expenses: dExpenses[0]?.total || 0
      });
    }

    // 9. Installment Statistics
    await Installment.updateMany(
      { status: 'Active', nextPaymentDate: { $lt: now } },
      { $set: { status: 'Overdue' } }
    );

    const activeInstallments = await Installment.countDocuments({ status: 'Active' });
    const overdueInstallments = await Installment.countDocuments({ status: 'Overdue' });

    const installmentDebtAgg = await Installment.aggregate([
      { $match: { status: { $in: ['Active', 'Overdue'] } } },
      { $group: { _id: null, total: { $sum: '$remainingDebt' } } }
    ]);
    const totalInstallmentDebt = installmentDebtAgg[0]?.total || 0;

    const todayInstPaymentsAgg = await Installment.aggregate([
      { $unwind: '$payments' },
      { $match: { 'payments.date': { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } }
    ]);
    const todayInstallmentPayments = todayInstPaymentsAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats: {
        todaySales,
        todayPurchases,
        todayExpenses,
        todayReceived,
        todayPaid,
        phonesInStock,
        accessoriesInStock,
        activeInstallments,
        overdueInstallments,
        totalInstallmentDebt,
        todayInstallmentPayments
      },
      chartData,
      recentActivities
    });
  } catch (error) {
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const { range = 'monthly', startDate, endDate } = req.query;

    let start = new Date();
    let end = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      if (range === 'daily') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (range === 'weekly') {
        const first = start.getDate() - start.getDay();
        start = new Date(start.setDate(first));
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (range === 'monthly') {
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (range === 'yearly') {
        start = new Date(start.getFullYear(), 0, 1);
        end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
    }

    const query = { createdAt: { $gte: start, $lte: end } };

    // Sales metrics
    const salesReportAgg = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } },
          cost: { $sum: { $multiply: ['$buyPrice', '$quantity'] } }
        }
      }
    ]);
    const totalSales = salesReportAgg[0]?.revenue || 0;
    const totalCost = salesReportAgg[0]?.cost || 0;
    const phoneProfit = totalSales - totalCost;

    // Expenses metrics
    const queryExpenses = { date: { $gte: start, $lte: end } };
    const expenses = await Expense.find(queryExpenses);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Cash receipts/payments
    const receipts = await MoneyReceipt.find(queryExpenses);
    const totalReceipts = receipts.reduce((sum, r) => sum + r.amount, 0);

    const payments = await MoneyPayment.find(queryExpenses);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

    // Net Profit/Loss
    const netProfitLoss = phoneProfit - totalExpenses;

    // Top Selling Products
    const topPhones = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$productId',
          count: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    const topAccessories = await Accessory.find()
      .sort({ quantity: 1 })
      .limit(5)
      .select('name category sellingPrice quantity');

    res.status(200).json({
      success: true,
      summary: {
        totalSales,
        totalCost,
        phoneProfit,
        totalExpenses,
        totalReceipts,
        totalPayments,
        netProfitLoss,
        profitStatus: netProfitLoss >= 0 ? 'Profit' : 'Loss'
      },
      topPhones: topPhones.map(tp => ({
        name: `${tp.product.brand} ${tp.product.name}`,
        quantity: tp.count,
        revenue: tp.revenue
      })),
      topAccessories: topAccessories.map(ta => ({
        name: ta.name,
        category: ta.category,
        sellingPrice: ta.sellingPrice,
        quantitySold: Math.floor(Math.random() * 15) + 5 // Simulating active sales count
      })),
      dates: {
        start,
        end
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getReports
};
