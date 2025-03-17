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

async function cleanAppointmentsData() {
  try {
    const appointmentsPath = path.join(CONFIG.resultsDir, CONFIG.appointmentsFile);
    log(`Reading appointments data from ${appointmentsPath}`);
    
    // Read the appointments file
    const data = await fs.readFile(appointmentsPath, 'utf8');
    const appointments = JSON.parse(data);
    
    // Track statistics for report
    const stats = {
      clinicians: 0,
      slotsAdded: 0,
      slotsRemoved: 0,
      cliniciansWithNoSlots: 0,
      locationsExtracted: 0
    };
    
    // Clean up each clinician's data
    for (const [clinicianId, clinician] of Object.entries(appointments)) {
      stats.clinicians++;
      
      // Ensure the clinician has a name and slots properties
      if (!clinician.name && clinicianId) {
        // Try to find name from any slot's href
        if (clinician.slots && clinician.slots.length > 0) {
          const firstSlot = clinician.slots[0];
          if (firstSlot.href) {
            clinician.name = `Clinician ${clinicianId}`;
          }
        }
      }
      
      // Ensure slots is an array
      if (!clinician.slots) {
        clinician.slots = [];
      } else if (!Array.isArray(clinician.slots)) {
        // Convert to array if not already
        clinician.slots = [clinician.slots];
      }
      
      // Clean up slots
      if (clinician.slots.length > 0) {
        const originalCount = clinician.slots.length;
        
        // Filter out invalid slots (without href or with href === '#')
        clinician.slots = clinician.slots.filter(slot => {
          // Keep if it has a valid href
          return slot && slot.href && slot.href !== '#';
        });
        
        // Ensure each slot has required fields
        clinician.slots.forEach(slot => {
          // Extract location ID from href if not already present
          if (slot.href && !slot.locationId) {
            const match = slot.href.match(/location=(\d+)/);
            if (match && match[1]) {
              slot.locationId = match[1];
              stats.locationsExtracted++;
            }
          }
          
          // Ensure status is set
          if (!slot.status) {
            slot.status = 'listed';
          }
        });
        
        // Update statistics
        stats.slotsRemoved += (originalCount - clinician.slots.length);
      }
      
      // Mark clinicians with no slots
      if (clinician.slots.length === 0) {
        stats.cliniciansWithNoSlots++;
      }
      
      // Ensure locations array exists
      if (!clinician.locations) {
        clinician.locations = [];
      }
      
      // Extract unique locations from slots
      const uniqueLocations = new Map();
      clinician.slots.forEach(slot => {
        if (slot.locationId && slot.location) {
          uniqueLocations.set(slot.locationId, slot.location);
        }
      });
      
      // Update locations array
      clinician.locations = Array.from(uniqueLocations.entries()).map(([id, name]) => ({
        id,
        name
      }));
    }
    
    // Write the cleaned data back to the file
    await fs.writeFile(appointmentsPath, JSON.stringify(appointments, null, 2));
    
    log(`Cleaned appointments data: ${stats.clinicians} clinicians processed`, 'success');
    log(`Location IDs extracted for ${stats.locationsExtracted} slots`, 'success');
    
    return { appointments, stats };
    
  } catch (error) {
    log(`Error cleaning appointments data: ${error.message}`, 'error');
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  cleanAppointmentsData().catch(err => {
    log(`Failed: ${err.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { cleanAppointmentsData };