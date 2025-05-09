const Product = require('../models');
const User = require('../../auth-service/models');

const resolvers = {
  Query: {
    // Get all products
    products: async () => {
      try {
        const products = await Product.find();
        return products;
      } catch (error) {
        console.error('Error fetching products:', error);
        throw new Error('Failed to fetch products');
      }
    },
    
    // Get a single product by ID
    product: async (_, { id }) => {
      try {
        const product = await Product.findById(id);
        return product;
      } catch (error) {
        console.error('Error fetching product:', error);
        throw new Error('Failed to fetch product');
      }
    }
  },
  
  Mutation: {
    // Create a new product (admin only)
    createProduct: async (_, { name, description, price, stock }, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is admin (using the pre-fetched role in context)
      if (!context.isAdmin) {
        throw new Error('Not authorized. Admin role required');
      }
      
      try {
        const product = new Product({
          name,
          description,
          price,
          stock
        });
        
        await product.save();
        return product;
      } catch (error) {
        console.error('Error creating product:', error);
        throw new Error(error.message || 'Failed to create product');
      }
    },
    
    // Update an existing product (admin only)
    updateProduct: async (_, { id, name, description, price, stock }, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is admin (using the pre-fetched role in context)
      if (!context.isAdmin) {
        throw new Error('Not authorized. Admin role required');
      }
      
      try {
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (price !== undefined) updates.price = price;
        if (stock !== undefined) updates.stock = stock;
        
        const product = await Product.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true }
        );
        
        if (!product) {
          throw new Error('Product not found');
        }
        
        return product;
      } catch (error) {
        console.error('Error updating product:', error);
        throw new Error(error.message || 'Failed to update product');
      }
    },
    
    // Delete a product (admin only)
    deleteProduct: async (_, { id }, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is admin (using the pre-fetched role in context)
      if (!context.isAdmin) {
        throw new Error('Not authorized. Admin role required');
      }
      
      try {
        const product = await Product.findByIdAndDelete(id);
        
        if (!product) {
          throw new Error('Product not found');
        }
        
        return true;
      } catch (error) {
        console.error('Error deleting product:', error);
        throw new Error(error.message || 'Failed to delete product');
      }
    }
  }
};

module.exports = resolvers;