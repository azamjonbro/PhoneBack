const express = require('express');
const {
  receiveMoney,
  getReceipts,
  payMoney,
  getPayments,
  createExpense,
  getExpenses,
  deleteExpense
} = require('../controllers/cashController');
const { protect } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/role');

const router = express.Router();

router.use(protect);

// Receipts (Cash In)
router.route('/receipts')
  .get(getReceipts)
  .post(checkPermission('sales'), receiveMoney);

// Payments (Cash Out)
router.route('/payments')
  .get(getPayments)
  .post(checkPermission('inventory:write'), payMoney);

// Expenses
router.route('/expenses')
  .get(getExpenses)
  .post(checkPermission('expenses'), createExpense);

router.route('/expenses/:id')
  .delete(checkPermission('expenses'), deleteExpense);

module.exports = router;
