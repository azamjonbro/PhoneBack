const mongoose = require('mongoose');

const PhoneSchema = new mongoose.Schema({
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  storage: {
    type: String,
    trim: true
  },
  ram: {
    type: String,
    trim: true
  },
  imei1: {
    type: String,
    required: [true, 'IMEI 1 is required'],
    unique: true,
    trim: true
  },
  imei2: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: [0, 'Selling price cannot be negative']
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  status: {
    type: String,
    enum: ['In Stock', 'Sold', 'Reserved'],
    default: 'In Stock'
  },
  purchaseInvoiceNumber: {
    type: String,
    trim: true
  },
  clientName: {
    type: String,
    trim: true
  },
  clientPhone: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    enum: ['New', 'Used', 'Refurbished'],
    default: 'Used'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Phone', PhoneSchema);
