const mongoose = require('mongoose');
const CONFIG = require('../config');

// Helper function for formatted logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌ ERROR' : 
                 type === 'success' ? '✅ SUCCESS' : 
                 type === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

// Function to connect to the MongoDB database
async function connectToDatabase() {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      log('Already connected to MongoDB', 'info');
      return true;
    }
    
    log('Connecting to MongoDB database...');
    
    // Use a local MongoDB URI if MongoDB Atlas fails
    let uri = CONFIG.mongodb.uri;
    
    // Connect with options
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
      maxPoolSize: 10 // Maintain up to 10 connections
    });
    
    log('Connected to MongoDB database successfully', 'success');
    return true;
    
  } catch (error) {
    log(`Failed to connect to MongoDB: ${error.message}`, 'error');
    
    // Try connecting to local MongoDB as fallback
    try {
      log('Attempting to connect to local MongoDB instance...');
      await mongoose.connect('mongodb://localhost:27017/therapyPortal');
      log('Connected to local MongoDB database successfully', 'success');
      return true;
    } catch (localError) {
      log(`Local MongoDB connection also failed: ${localError.message}`, 'error');
      return false;
    }
  }
}

// Function to disconnect from the MongoDB database
async function disconnectFromDatabase() {
  try {
    // Only disconnect if connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      log('Disconnected from MongoDB database', 'success');
    }
    return true;
  } catch (error) {
    log(`Failed to disconnect from MongoDB: ${error.message}`, 'error');
    return false;
  }
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase
};