const Product = require('../models/Product');
const mongoose = require('mongoose');

class ProductRepository {
  async create(productData) {
    return await Product.create(productData);
  }

  async findById(id) {
    return await Product.findById(id);
  }

  async findOne(filter) {
    return await Product.findOne(filter);
  }

  async updateById(id, updateData) {
    return await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  async deleteById(id) {
    return await Product.findByIdAndDelete(id);
  }

  async getProductsWithStock({ search, brand, condition, page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' }) {
    const pipeline = [];

    // Search and filters
    const match = {};
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      match.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { storage: searchRegex },
        { condition: searchRegex }
      ];
    }
    if (brand) {
      match.brand = brand;
    }
    if (condition) {
      match.condition = condition;
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    // Lookup inventory entries
    pipeline.push({
      $lookup: {
        from: 'inventoryentries',
        localField: '_id',
        foreignField: 'productId',
        as: 'entries'
      }
    });

    // Lookup sales
    pipeline.push({
      $lookup: {
        from: 'sales',
        localField: '_id',
        foreignField: 'productId',
        as: 'sales'
      }
    });

    // Add calculations
    pipeline.push({
      $addFields: {
        totalIn: { $sum: '$entries.quantity' },
        totalOut: { $sum: '$sales.quantity' }
      }
    });

    pipeline.push({
      $addFields: {
        quantity: { $subtract: ['$totalIn', '$totalOut'] }
      }
    });

    // Sorting
    const sortStage = {};
    sortStage[sortBy] = order === 'asc' ? 1 : -1;
    pipeline.push({ $sort: sortStage });

    // For total count before paging
    const countPipeline = [...pipeline, { $count: 'count' }];
    const countResult = await Product.aggregate(countPipeline);
    const total = countResult[0]?.count || 0;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute aggregation
    const data = await Product.aggregate(pipeline);

    return {
      data,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    };
  }

  // Get autocomplete product suggestions
  async getSuggestions(searchQuery) {
    if (!searchQuery) return [];
    const searchRegex = new RegExp(searchQuery.trim(), 'i');
    
    // Aggregate products with stock
    const suggestions = await Product.aggregate([
      {
        $match: {
          $or: [
            { name: searchRegex },
            { brand: searchRegex }
          ]
        }
      },
      {
        $lookup: {
          from: 'inventoryentries',
          localField: '_id',
          foreignField: 'productId',
          as: 'entries'
        }
      },
      {
        $lookup: {
          from: 'sales',
          localField: '_id',
          foreignField: 'productId',
          as: 'sales'
        }
      },
      {
        $addFields: {
          totalIn: { $sum: '$entries.quantity' },
          totalOut: { $sum: '$sales.quantity' },
          lastEntry: { $arrayElemAt: [{ $sortArray: { input: '$entries', sortBy: { createdAt: -1 } } }, 0] },
          lastSale: { $arrayElemAt: [{ $sortArray: { input: '$sales', sortBy: { createdAt: -1 } } }, 0] }
        }
      },
      {
        $project: {
          productName: '$name',
          brand: 1,
          storage: 1,
          condition: 1,
          stock: { $subtract: ['$totalIn', '$totalOut'] },
          purchaseCount: { $size: '$entries' },
          lastPurchasePrice: { $ifNull: ['$lastEntry.buyPrice', 0] },
          lastSellingPrice: { $ifNull: ['$lastSale.sellingPrice', 0] }
        }
      },
      { $limit: 8 }
    ]);
    return suggestions;
  }
}

module.exports = new ProductRepository();
