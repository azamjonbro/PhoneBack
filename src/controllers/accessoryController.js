const Accessory = require('../models/Accessory');
const logActivity = require('../utils/historyLogger');

// @desc    Get all accessories with search and filters
// @route   GET /api/accessories
const getAccessories = async (req, res, next) => {
  try {
    const { search, category, lowStock, page = 1, limit = 10 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) query.category = category;

    if (lowStock === 'true') {
      // Return accessories where quantity is less than or equal to stockAlert threshold
      query.$expr = { $lte: ['$quantity', '$stockAlert'] };
    }

    const skipIndex = (page - 1) * limit;

    const total = await Accessory.countDocuments(query);
    const accessories = await Accessory.find(query)
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skipIndex);

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: accessories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new accessory
// @route   POST /api/accessories
const createAccessory = async (req, res, next) => {
  try {
    const accessory = await Accessory.create(req.body);

    await logActivity({
      action: 'Accessory Added',
      details: `Added Accessory: ${accessory.name} (${accessory.category}) - Qty: ${accessory.quantity}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({ success: true, data: accessory });
  } catch (error) {
    next(error);
  }
};

// @desc    Update accessory
// @route   PUT /api/accessories/:id
const updateAccessory = async (req, res, next) => {
  try {
    let accessory = await Accessory.findById(req.params.id);
    if (!accessory) {
      return res.status(404).json({ success: false, message: 'Accessory not found' });
    }

    const oldQty = accessory.quantity;
    accessory = await Accessory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (oldQty !== accessory.quantity) {
      await logActivity({
        action: 'Inventory Updated',
        details: `Adjusted Accessory Qty for ${accessory.name}: ${oldQty} -> ${accessory.quantity}`,
        createdBy: req.user._id,
        username: req.user.username
      });
    } else {
      await logActivity({
        action: 'Inventory Updated',
        details: `Updated Accessory details for ${accessory.name}`,
        createdBy: req.user._id,
        username: req.user.username
      });
    }

    res.status(200).json({ success: true, data: accessory });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete accessory
// @route   DELETE /api/accessories/:id
const deleteAccessory = async (req, res, next) => {
  try {
    const accessory = await Accessory.findById(req.params.id);
    if (!accessory) {
      return res.status(404).json({ success: false, message: 'Accessory not found' });
    }

    await accessory.deleteOne();

    await logActivity({
      action: 'Inventory Updated',
      details: `Deleted Accessory: ${accessory.name} from category ${accessory.category}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, message: 'Accessory removed from inventory' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAccessories,
  createAccessory,
  updateAccessory,
  deleteAccessory
};
