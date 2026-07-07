const mongoose = require('mongoose');

const AccessorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Accessory name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  barcode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allows multiple documents to have no barcode
  },
  description: {
    type: String,
    trim: true
  },
  stockAlert: {
    type: Number,
    default: 5,
    min: [0, 'Stock alert threshold cannot be negative']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Accessory', AccessorySchema);
