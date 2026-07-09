const express = require('express');
const {
  getPhones,
  getPhoneById,
  createPhone,
  updatePhone,
  deletePhone,
  getPhoneSuggestions,
  getCustomerSuggestions,
  getProductEntries,
  updateInventoryEntry,
  deleteInventoryEntry
} = require('../controllers/phoneController');
const { protect } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/role');

const router = express.Router();

router.use(protect);

router.get('/suggestions', getPhoneSuggestions);
router.get('/customers', getCustomerSuggestions);

// Managing individual entries (must precede parameter-based routes to avoid collisions)
router.route('/entries/:entryId')
  .put(checkPermission('inventory:write'), updateInventoryEntry)
  .delete(checkPermission('inventory:write'), deleteInventoryEntry);

router.route('/')
  .get(getPhones)
  .post(checkPermission('inventory:write'), createPhone);

router.route('/:id')
  .get(getPhoneById)
  .put(checkPermission('inventory:write'), updatePhone)
  .delete(checkPermission('inventory:write'), deletePhone);

router.route('/:id/entries')
  .get(getProductEntries);

module.exports = router;
