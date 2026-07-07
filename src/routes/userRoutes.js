const express = require('express');
const { getUsers, createUser, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { adminOnly } = require('../middlewares/role');

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

router.route('/:id/reset-password')
  .post(resetPassword);

module.exports = router;
