const Sale = require('../models/Sale');

class SaleRepository {
  async create(saleData) {
    return await Sale.create(saleData);
  }

  async findById(id) {
    return await Sale.findById(id).populate('productId').populate('customerId');
  }

  async find(filter = {}) {
    return await Sale.find(filter)
      .populate('productId')
      .populate('customerId')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });
  }

  async updateById(id, updateData) {
    return await Sale.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  async deleteById(id) {
    return await Sale.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return await Sale.countDocuments(filter);
  }
}

module.exports = new SaleRepository();
