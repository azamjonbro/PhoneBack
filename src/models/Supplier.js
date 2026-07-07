const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    unique: true,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  balance: {
    type: Number,
    default: 0 // Negative means we owe them, positive means they owe us / prepayments
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Supplier', SupplierSchema);
