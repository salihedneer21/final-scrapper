const fs = require('fs').promises;
const path = require('path');
const CONFIG = require('../config');

// Helper function for formatted logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌ ERROR' : 
                 type === 'success' ? '✅ SUCCESS' : 
                 type === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

async function formatDates() {
  try {
    const appointmentsFilePath = path.join(CONFIG.resultsDir, CONFIG.appointmentsFile);
    
    log('Reading appointments data file...');
    const data = await fs.readFile(appointmentsFilePath, 'utf8');
    const appointments = JSON.parse(data);
    
    let updateCount = 0;
    let skipCount = 0;
    
    // Process each clinician
    for (const clinicianId in appointments) {
      const clinician = appointments[clinicianId];
      
      // Check if there are slots
      if (!clinician.slots || !Array.isArray(clinician.slots)) {
        continue;
      }
      
      // Process each slot
      for (const slot of clinician.slots) {
        // Check if the slot has a valid href
        if (slot.href) {
          try {
            // Extract the date from the URL
            const match = slot.href.match(/timeSlot=(\d{4}-\d{2}-\d{2})T/);
            
            if (match && match[1]) {
              const dateString = match[1]; // Format: 2025-03-10
              
              // Parse the date
              const dateObj = new Date(dateString);
              
              // Store original display format
              slot.shortDate = slot.date;
              
              // Format the date in desired format (full date)
              const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              };
              
              const formattedDate = dateObj.toLocaleDateString('en-US', options);
              
              // Update the slot date
              slot.date = formattedDate;
              
              // Add ISO format for easy sorting/filtering
              slot.isoDate = dateString;
              updateCount++;
            } else {
              skipCount++;
              log(`Could not extract date from URL: ${slot.href}`, 'warning');
            }
          } catch (error) {
            skipCount++;
            log(`Error processing URL: ${slot.href}`, 'error');
          }
        } else if (slot.time && slot.date) {
          // If there's no href but there is a date and time, mark it as lacking URL
          skipCount++;
          slot.dateFormatError = "Missing URL to extract date from";
        }
      }
    }
    
    // Write updated data back to file
    await fs.writeFile(appointmentsFilePath, JSON.stringify(appointments, null, 2));
    
    log(`Date formatting complete! ${updateCount} dates updated, ${skipCount} dates skipped.`, 'success');
  } catch (error) {
    log(`Error formatting dates: ${error.message}`, 'error');
    throw error;
  }
}

// If this script is run directly
if (require.main === module) {
  formatDates().catch(error => {
    log(`Unhandled error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { formatDates };