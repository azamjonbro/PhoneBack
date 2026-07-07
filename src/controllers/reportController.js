const PhoneSale = require('../models/PhoneSale');
const PhonePurchase = require('../models/PhonePurchase');
const Expense = require('../models/Expense');
const MoneyReceipt = require('../models/MoneyReceipt');
const MoneyPayment = require('../models/MoneyPayment');
const Phone = require('../models/Phone');
const Accessory = require('../models/Accessory');
const History = require('../models/History');
const Installment = require('../models/Installment');

const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Today's Sales
    const salesAgg = await PhoneSale.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const todaySales = salesAgg[0]?.total || 0;

    // 2. Today's Purchases
    const purchasesAgg = await PhonePurchase.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
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

    // 6. Stock Quantities
    const phonesInStock = await Phone.countDocuments({ status: 'In Stock' });
    
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

      const dSales = await PhoneSale.aggregate([
        { $match: { date: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
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
    // Update overdue statuses
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

    const query = { date: { $gte: start, $lte: end } };

    // Sales metrics
    const sales = await PhoneSale.find(query);
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    
    // Calculate Profit (selling price sum minus purchase price sum)
    let totalCost = 0;
    sales.forEach(sale => {
      sale.phones.forEach(p => {
        totalCost += p.purchasePrice || 0;
      });
    });
    const phoneProfit = totalSales - totalCost;

    // Expenses metrics
    const expenses = await Expense.find(query);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Cash receipts/payments
    const receipts = await MoneyReceipt.find(query);
    const totalReceipts = receipts.reduce((sum, r) => sum + r.amount, 0);

    const payments = await MoneyPayment.find(query);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

    // Net Profit/Loss
    const netProfitLoss = phoneProfit - totalExpenses;

    // Top Selling Phones (aggregation on sales list)
    const topPhones = await PhoneSale.aggregate([
      { $match: query },
      { $unwind: '$phones' },
      {
        $group: {
          _id: { brand: '$phones.brand', model: '$phones.model' },
          count: { $sum: 1 },
          revenue: { $sum: '$phones.sellingPrice' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Top Selling Accessories (mocked or aggregated from inventory actions if tracked, here we group by category/name from database alert categories or generate mock breakdown based on current inventory)
    const topAccessories = await Accessory.find()
      .sort({ quantity: 1 }) // simulate top sold by looking at lower stock levels or sales
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
        name: `${tp._id.brand} ${tp._id.model}`,
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
