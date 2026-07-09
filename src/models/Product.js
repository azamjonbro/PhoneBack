const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  storage: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    enum: ['New', 'Used', 'Refurbished'],
    required: [true, 'Condition is required']
  }
}, {
  timestamps: true
});

// Compound index to ensure uniqueness of name + brand + storage + condition combo
ProductSchema.index({ name: 1, brand: 1, storage: 1, condition: 1 }, { unique: true });

module.exports = mongoose.model('Product', ProductSchema);
