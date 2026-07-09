const InventoryEntry = require('../models/InventoryEntry');

class InventoryRepository {
  async create(entryData) {
    return await InventoryEntry.create(entryData);
  }

  async findById(id) {
    return await InventoryEntry.findById(id).populate('productId');
  }

  async find(filter = {}) {
    return await InventoryEntry.find(filter)
      .populate('productId')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });
  }

  async updateById(id, updateData) {
    return await InventoryEntry.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  async deleteById(id) {
    return await InventoryEntry.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return await InventoryEntry.countDocuments(filter);
  }
}

module.exports = new InventoryRepository();
