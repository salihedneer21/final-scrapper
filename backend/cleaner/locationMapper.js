const fs = require('fs').promises;
const path = require('path');
const CONFIG = require('../config');
const { LOCATIONS } = require('../locations');

// Helper function for formatted logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌ ERROR' : 
                 type === 'success' ? '✅ SUCCESS' : 
                 type === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

/**
 * Extract location information from URLs in appointments data
 * No scraping needed since all location IDs are in the URLs
 */
async function processAppointmentLocations() {
  try {
    // Read appointments data
    const appointmentsPath = path.join(CONFIG.resultsDir, CONFIG.appointmentsFile);
    log(`Reading appointments data from ${appointmentsPath}`);
    
    const data = await fs.readFile(appointmentsPath, 'utf8');
    const appointments = JSON.parse(data);
    
    // Track statistics
    const stats = {
      clinicians: 0,
      totalSlots: 0,
      locationsAdded: 0
    };
    
    // Process each clinician
    for (const [clinicianId, clinician] of Object.entries(appointments)) {
      stats.clinicians++;
      
      // Skip if no slots or not an array
      if (!clinician.slots || !Array.isArray(clinician.slots)) {
        continue;
      }
      
      // Create locations map for this clinician
      const clinicianLocations = new Map();
      
      // Process each slot
      clinician.slots.forEach(slot => {
        stats.totalSlots++;
        
        // Extract location ID from the href if it exists
        if (slot.href && typeof slot.href === 'string') {
          const match = slot.href.match(/location=(\d+)/);
          if (match && match[1]) {
            const locationId = match[1];
            
            // Add location ID to slot
            slot.locationId = locationId;
            
            // Add location name using our mapping
            if (LOCATIONS[locationId]) {
              slot.location = LOCATIONS[locationId];
              stats.locationsAdded++;
              
              // Add to the clinician's locations map
              clinicianLocations.set(locationId, LOCATIONS[locationId]);
            }
          }
        }
      });
      
      // Add unique locations array to clinician
      clinician.locations = Array.from(clinicianLocations.entries()).map(([id, name]) => ({
        id,
        name
      }));
    }
    
    // Save the updated appointments data (using the same file)
    await fs.writeFile(appointmentsPath, JSON.stringify(appointments, null, 2));
    
    log(`Processed ${stats.clinicians} clinicians with ${stats.totalSlots} slots`, 'success');
    log(`Added location information to ${stats.locationsAdded} slots`, 'success');
    
    return appointments;
  } catch (error) {
    log(`Error processing appointment locations: ${error.message}`, 'error');
    throw error;
  }
}

// Main function
async function scrapeLocations() {
  try {
    log('Starting location processing (no scraping needed)...');
    await processAppointmentLocations();
    log('Location processing completed successfully!', 'success');
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  scrapeLocations().catch(error => {
    log(`Unhandled error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { scrapeLocations };