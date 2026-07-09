const productService = require('../services/productService');
const inventoryService = require('../services/inventoryService');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const logActivity = require('../utils/historyLogger');

// @desc    Get all products with stock quantity, filters, search
// @route   GET /api/phones
const getPhones = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, brand, condition, sortBy = 'createdAt', order = 'desc' } = req.query;

    const result = await productService.getProductsWithStock({
      page,
      limit,
      search,
      brand,
      condition,
      sortBy,
      order
    });

    res.status(200).json({
      success: true,
      count: result.data.length,
      total: result.total,
      pages: result.pages,
      currentPage: result.currentPage,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by id
// @route   GET /api/phones/:id
const getPhoneById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Product and initial InventoryEntry
// @route   POST /api/phones
const createPhone = async (req, res, next) => {
  try {
    const { name, brand, storage, condition, quantity, buyPrice, note } = req.body;

    if (!name || !brand || !condition || quantity === undefined || buyPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, brand, condition, quantity and buy price are required'
      });
    }

    // 1. Resolve or create product
    const product = await productService.createOrGetProduct({
      name,
      brand,
      storage,
      condition
    });

    // 2. Create inventory entry
    const entry = await inventoryService.createEntry({
      productId: product._id,
      quantity: parseInt(quantity),
      buyPrice: parseFloat(buyPrice),
      note: note || '',
      createdBy: req.user._id
    });

    await logActivity({
      action: 'Inventory Restocked',
      details: `Added ${quantity} units of ${product.brand} ${product.name} @ $${buyPrice}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(201).json({
      success: true,
      data: product,
      entry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Product info
// @route   PUT /api/phones/:id
const updatePhone = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await logActivity({
      action: 'Product Updated',
      details: `Updated product details for ${product.brand} ${product.name}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/phones/:id
const deletePhone = async (req, res, next) => {
  try {
    const success = await productService.deleteProductIfEmpty(req.params.id);
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product that still has stock history or sales.'
      });
    }

    await logActivity({
      action: 'Product Deleted',
      details: `Deleted product ID: ${req.params.id}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, message: 'Product removed from catalog' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get autocomplete product suggestions
// @route   GET /api/phones/suggestions
const getPhoneSuggestions = async (req, res, next) => {
  try {
    const suggestions = await productService.getSuggestions(req.query.search);
    res.status(200).json({ success: true, suggestions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer suggestions
// @route   GET /api/phones/customers
const getCustomerSuggestions = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    if (!search || search.trim().length < 1) {
      return res.status(200).json({ success: true, customers: [] });
    }

    const searchRegex = new RegExp(search.trim(), 'i');

    const customerSuggestions = await Customer.find({
      $or: [
        { name: searchRegex },
        { phone: searchRegex }
      ]
    }).limit(10);

    const suggestions = customerSuggestions.map(c => ({
      name: c.name,
      phone: c.phone || ''
    }));

    res.status(200).json({ success: true, customers: suggestions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all inventory entries for a product
// @route   GET /api/phones/:id/entries
const getProductEntries = async (req, res, next) => {
  try {
    const entries = await inventoryService.getEntriesByProduct(req.params.id);
    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a specific inventory entry
// @route   PUT /api/phones/entries/:entryId
const updateInventoryEntry = async (req, res, next) => {
  try {
    const entry = await inventoryService.updateEntry(req.params.entryId, req.body);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Inventory entry not found' });
    }

    await logActivity({
      action: 'Inventory Entry Updated',
      details: `Updated entry ${req.params.entryId}. New qty: ${entry.quantity}, Price: $${entry.buyPrice}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a specific inventory entry
// @route   DELETE /api/phones/entries/:entryId
const deleteInventoryEntry = async (req, res, next) => {
  try {
    const entry = await inventoryService.deleteEntry(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Inventory entry not found' });
    }

    await logActivity({
      action: 'Inventory Entry Deleted',
      details: `Deleted entry ${req.params.entryId} of quantity ${entry.quantity}`,
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, message: 'Inventory entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
