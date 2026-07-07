const express = require('express');
const { getAccessories, createAccessory, updateAccessory, deleteAccessory } = require('../controllers/accessoryController');
const { protect } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/role');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAccessories)
  .post(checkPermission('inventory:write'), createAccessory);

router.route('/:id')
  .put(checkPermission('inventory:write'), updateAccessory)
  .delete(checkPermission('inventory:write'), deleteAccessory);

module.exports = router;
