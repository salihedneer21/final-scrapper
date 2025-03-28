const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const CONFIG = require('./config');
const { syncWithMongoDB } = require('./mongoSync');
const { cleanAppointmentsData } = require('./cleaner/cleanHrefs');
const { cleanClinicianNames } = require('./cleaner/nameCleaner'); // Import the name cleaner
const { fixDateConsistencies } = require('./cleaner/dateConsistencyFixer'); // Import the date consistency fixer

// Helper function for formatted logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌ ERROR' : 
                 type === 'success' ? '✅ SUCCESS' : 
                 type === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

// Function to run a script as a child process and return a promise
function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    // Make sure the script exists
    if (!fsSync.existsSync(scriptPath)) {
      reject(new Error(`Script not found: ${scriptPath}`));
      return;
    }

    log(`Starting script: ${path.basename(scriptPath)}`);
    
    const nodeArgs = ['--input-type=commonjs', scriptPath, ...args];
    const process = spawn('node', nodeArgs, {
      stdio: 'inherit' // This will pipe the child's stdout/stderr to the parent
    });

    process.on('close', (code) => {
      if (code === 0) {
        log(`Script ${path.basename(scriptPath)} completed successfully`, 'success');
        resolve();
      } else {
        reject(new Error(`Script ${path.basename(scriptPath)} exited with code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`Failed to start script ${path.basename(scriptPath)}: ${err.message}`));
    });
  });
}

// Clear existing data to force fresh scraping
async function clearExistingData() {
  try {
    const appointmentsPath = path.join(CONFIG.resultsDir, CONFIG.appointmentsFile);
    
    if (fsSync.existsSync(appointmentsPath)) {
      await fs.unlink(appointmentsPath);
      log('Removed existing appointments data to ensure fresh scraping', 'info');
    }
  } catch (error) {
    log(`Warning: Failed to clear existing data: ${error.message}`, 'warning');
    // Continue execution even if clearing fails
  }
}

// Main function to orchestrate the execution
async function main() {
  try {
    // Ensure results directory exists
    await fs.mkdir(CONFIG.resultsDir, { recursive: true });
    
    // Always clear existing data before running
    await clearExistingData();
    
    // Run scrapper.js without any flags
    await runScript('./scrapper.js');
    
    // Run error retry for any clinicians that had errors
    //log('Running error retry for failed clinicians...');
    await runScript('./errorRetry.js');

    await runScript('./errorRetry.js');
    
    await runScript('./errorRetry.js');
    
    // Clean up empty href entries
    //log('Cleaning empty href entries from appointments data...');
    await cleanAppointmentsData();
    
    // Continue with location mapper
    await runScript('./cleaner/locationMapper.js');
    
    // Clean clinician names
    await cleanClinicianNames();
    
    // Format dates using the new script
    log('Formatting dates from URL timestamps...');
    await runScript('./cleaner/dateFormatter.js');
    
    // Fix any date inconsistencies
    log('Checking and fixing date inconsistencies...');
    await fixDateConsistencies();
    
    // Sync data with MongoDB
    // log('Synchronizing data with MongoDB...');
    await syncWithMongoDB();
    
    log('All tasks completed successfully', 'success');
  } catch (error) {
    log(`Execution failed: ${error.message}`, 'error');
    throw error;
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    log(`Unhandled error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main };