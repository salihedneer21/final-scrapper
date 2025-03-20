const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { main } = require('./main');
const path = require('path');
const CONFIG = require('./config');
const formRoutes = require('./routes/formRoutes');
const bookingsRoutes = require('./routes/bookingsRoutes');
const { connectToDatabase } = require('./services/dbService');
require('./models/AppointmentStatus');
require('./models/BookingsLogs'); // Make sure this exists as well
const formSubmitter = require('./services/formSubmitter');
const cors = require('cors'); // Add this line


// Initialize express app
const app = express();
const PORT = process.env.PORT || 7777;


// Helper function for formatted logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌ ERROR' : 
                 type === 'success' ? '✅ SUCCESS' : 
                 type === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}



app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, '../frontend/build')));


// Add this line after your middleware setup
app.use('/api/forms/screenshots', express.static(path.join(__dirname, 'screenshots')));

// API Routes
app.use('/api', bookingsRoutes);
app.use('/api/forms', formRoutes);


// Basic status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    serverTime: new Date().toISOString()
  });
});

// Run scraper function - always run from scratch
async function runScraper() {
  try {
    log('Starting fresh scraper run', 'info');
    // Call main without any parameters
    await main();
    log('Scraper run completed successfully', 'success');
  } catch (error) {
    log(`Error in scraper run: ${error.message}`, 'error');
  }
}


const cronJob = cron.schedule('0 */4 * * *', async () => {
   log('Running scheduled scraper job', 'info');
   await runScraper();
 });

// New cron job to process unknown appointments every 5 minutes
const processUnknownCronJob = cron.schedule('*/5 * * * *', async () => {
  try {
    log('Running scheduled job to process unknown appointments', 'info');
    
    // Call the processUnknownAppointments function directly
    const results = await formSubmitter.processUnknownAppointments();
    
    // Log the results
    if (results.error) {
      log(`Error in processing unknown appointments: ${results.error}`, 'error');
    } else {
      log(`Successfully processed unknown appointments. Success: ${results.success}, Failed: ${results.failed}, Total: ${results.total}`, 'success');
    }
  } catch (error) {
    log(`Exception in appointment processing job: ${error.message}`, 'error');
  }
});

// Manually trigger scraper endpoint (for testing)
app.post('/api/run', async (req, res) => {
  try {
    res.json({ message: 'Scraper started' });
    runScraper();
  } catch (error) {
    log(`Error triggering scraper manually: ${error.message}`, 'error');
  }
});



// For all other routes, serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});






// Store server instance
let server;

// Start server with proper shutdown handling
server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`, 'success');
  
  // Connect to MongoDB
  try {
    await connectToDatabase();
    log('Connected to MongoDB', 'success');
  } catch (error) {
    log(`Failed to connect to MongoDB: ${error.message}`, 'error');
  }
  
  log('Cron job set to run scraper every 30 minutes', 'info');
  
  // Run the scraper immediately when server starts
  log('Running initial scraper job on server startup', 'info');
  setTimeout(() => {
    runScraper();
  }, 2000);
});

// Function to gracefully shut down the server
function gracefulShutdown() {
  log('Received kill signal, shutting down gracefully...', 'warning');
  
  // Stop the cron jobs
  if (cronJob) {
    cronJob.stop();
    log('Scraper cron job stopped', 'info');
  }
  
  if (processUnknownCronJob) {
    processUnknownCronJob.stop();
    log('Process-unknown cron job stopped', 'info');
  }
  
  // Close the server
  if (server) {
    server.close(() => {
      log('HTTP server closed', 'success');
      
      // Close database connection if open
      if (mongoose.connection.readyState) {
        mongoose.connection.close(false, () => {
          log('MongoDB connection closed', 'success');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
    
    // If server doesn't close in 10 seconds, force exit
    setTimeout(() => {
      log('Could not close connections in time, forcefully shutting down', 'error');
      process.exit(1);
    }, 10000);
  }
}

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // For nodemon restarts

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log(`Uncaught Exception: ${err.message}`, 'error');
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection: ${reason}`, 'error');
  gracefulShutdown();
});