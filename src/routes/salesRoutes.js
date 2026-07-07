const express = require('express');
const { sellPhones, getSales, getSaleByInvoice, getCustomers, createCustomer } = require('../controllers/salesController');
const { protect } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/role');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSales)
  .post(checkPermission('sales'), sellPhones);

router.route('/customers')
  .get(getCustomers)
  .post(checkPermission('sales'), createCustomer);

router.route('/:invoiceNumber')
  .get(getSaleByInvoice);

module.exports = router;
