const express = require('express');
const History = require('../models/History');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skipIndex = (page - 1) * limit;
    const total = await History.countDocuments(query);
    const logs = await History.find(query)
      .sort({ date: -1 })
      .skip(skipIndex)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: logs
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
