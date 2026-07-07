const Phone = require('../models/Phone');
const logActivity = require('../utils/historyLogger');

// @desc    Get all phones with pagination, filters, search
// @route   GET /api/phones
const getPhones = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, brand, status, color, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};

    // Search query on imei1, imei2, serialNumber, brand, model
    if (search) {
      query.$or = [
        { imei1: { $regex: search, $options: 'i' } },
        { imei2: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { clientPhone: { $regex: search, $options: 'i' } }
      ];
    }

    if (brand) query.brand = brand;
    if (status) query.status = status;
    if (color) query.color = color;

    const skipIndex = (page - 1) * limit;

    const sortOption = {};
    sortOption[sortBy] = order === 'asc' ? 1 : -1;

    const total = await Phone.countDocuments(query);
    const phones = await Phone.find(query)
      .populate('supplier', 'name')
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip(skipIndex);

    res.status(200).json({
      success: true,
      count: phones.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: phones
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get phone by id or imei
// @route   GET /api/phones/:idOrImei
const getPhoneByIdOrImei = async (req, res, next) => {
  try {
    const { idOrImei } = req.params;
    let phone;

    // Check if idOrImei looks like a MongoDB ObjectId, otherwise search by imei1/serialNumber
    if (idOrImei.match(/^[0-9a-fA-F]{24}$/)) {
      phone = await Phone.findById(idOrImei).populate('supplier', 'name');
    } else {
      phone = await Phone.findOne({
        $or: [{ imei1: idOrImei }, { serialNumber: idOrImei }]
      }).populate('supplier', 'name');
    }

    if (!phone) {
      return res.status(404).json({ success: false, message: 'Phone not found' });
    }

    res.status(200).json({ success: true, data: phone });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new phone
// @route   POST /api/phones
const createPhone = async (req, res, next) => {
  try {
    const phone = await Phone.create(req.body);

    await logActivity({
      action: 'Phone Added',
      details: `Added Phone: ${phone.brand} ${phone.model} (${phone.color}) - IMEI: ${phone.imei1}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({ success: true, data: phone });
  } catch (error) {
    next(error);
  }
};

// @desc    Update phone
// @route   PUT /api/phones/:id
const updatePhone = async (req, res, next) => {
  try {
    let phone = await Phone.findById(req.id || req.params.id);
    if (!phone) {
      return res.status(404).json({ success: false, message: 'Phone not found' });
    }

    const oldStatus = phone.status;
    phone = await Phone.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await logActivity({
      action: 'Phone Updated',
      details: `Updated Phone ${phone.brand} ${phone.model}. Status: ${oldStatus} -> ${phone.status}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, data: phone });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete phone
// @route   DELETE /api/phones/:id
const deletePhone = async (req, res, next) => {
  try {
    const phone = await Phone.findById(req.params.id);
    if (!phone) {
      return res.status(404).json({ success: false, message: 'Phone not found' });
    }

    await phone.deleteOne();

    await logActivity({
      action: 'Inventory Updated',
      details: `Deleted Phone: ${phone.brand} ${phone.model} - IMEI: ${phone.imei1}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, message: 'Phone removed from inventory' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get autocomplete phone suggestions from previous purchases
// @route   GET /api/phones/suggestions
const getPhoneSuggestions = async (req, res, next) => {
  try {
    const { search = '' } = req.query;

    if (!search || search.trim().length < 1) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    const searchRegex = new RegExp(search.trim(), 'i');

    const suggestions = await Phone.aggregate([
      // Match by model/brand/color/storage/ram
      {
        $match: {
          $or: [
            { model: { $regex: searchRegex } },
            { brand: { $regex: searchRegex } }
          ]
        }
      },
      // Sort newest first to ensure $first gives the latest purchase details
      { $sort: { createdAt: -1 } },
      // Group by lowercase model name
      {
        $group: {
          _id: { $toLower: '$model' },
          productName: { $first: '$model' },
          brand: { $first: '$brand' },
          model: { $first: '$model' },
          lastPurchasePrice: { $first: '$purchasePrice' },
          purchasePrices: { $push: '$purchasePrice' },
          lastSellingPrice: { $first: '$sellingPrice' },
          lastPurchaseDate: { $first: '$createdAt' },
          purchaseCount: { $sum: 1 },
          storage: { $first: '$storage' },
          color: { $first: '$color' },
          stock: {
            $sum: {
              $cond: [{ $eq: ['$status', 'In Stock'] }, 1, 0]
            }
          },
          soldCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Sold'] }, 1, 0]
            }
          }
        }
      },
      // Calculate average price
      {
        $addFields: {
          averagePurchasePrice: { $avg: '$purchasePrices' }
        }
      },
      // Sort by newest purchase, popularity, name
      {
        $sort: {
          lastPurchaseDate: -1,
          purchaseCount: -1,
          productName: 1
        }
      },
      { $limit: 8 },
      {
        $project: {
          _id: 0,
          productName: 1,
          brand: 1,
          model: 1,
          lastPurchasePrice: 1,
          averagePurchasePrice: { $round: ['$averagePurchasePrice', 2] },
          lastSellingPrice: 1,
          stock: 1,
          purchaseCount: 1,
          soldCount: 1,
          lastPurchaseDate: 1,
          storage: 1,
          color: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get autocomplete customer suggestions from previous sales/purchases
// @route   GET /api/phones/customers
const getCustomerSuggestions = async (req, res, next) => {
  try {
    const { search = '' } = req.query;

    if (!search || search.trim().length < 1) {
      return res.status(200).json({ success: true, customers: [] });
    }

    const searchRegex = new RegExp(search.trim(), 'i');

    const phoneClients = await Phone.aggregate([
      {
        $match: {
          clientName: { $regex: searchRegex }
        }
      },
      {
        $group: {
          _id: { $toLower: '$clientName' },
          name: { $first: '$clientName' },
          phone: { $first: '$clientPhone' },
          lastActivity: { $max: '$createdAt' }
        }
      }
    ]);

    const PhoneSale = require('../models/PhoneSale');
    const saleClients = await PhoneSale.aggregate([
      {
        $match: {
          customerName: { $regex: searchRegex }
        }
      },
      {
        $group: {
          _id: { $toLower: '$customerName' },
          name: { $first: '$customerName' },
          phone: { $first: '$phoneNumber' },
          lastActivity: { $max: '$createdAt' }
        }
      }
    ]);

    const map = new Map();
    [...phoneClients, ...saleClients].forEach(c => {
      if (!c.name) return;
      const key = c.name.toLowerCase().trim();
      const existing = map.get(key);
      if (!existing || new Date(c.lastActivity) > new Date(existing.lastActivity)) {
        map.set(key, c);
      }
    });

    const suggestions = Array.from(map.values())
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, 10)
      .map(c => ({
        name: c.name,
        phone: c.phone || ''
      }));

    res.status(200).json({
      success: true,
      customers: suggestions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPhones,
  getPhoneByIdOrImei,
  createPhone,
  updatePhone,
  deletePhone,
  getPhoneSuggestions,
  getCustomerSuggestions
};
