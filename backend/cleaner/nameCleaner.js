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

// Function to clean clinician names
async function cleanClinicianNames() {
  try {
    log('Starting to clean clinician names...');
    
    // Read the appointments data
    const appointmentsPath = path.join(CONFIG.resultsDir, CONFIG.appointmentsFile);
    const data = await fs.readFile(appointmentsPath, 'utf8');
    const appointments = JSON.parse(data);
    
    let cliniciansProcessed = 0;
    
    // Process each clinician
    for (const clinicianId in appointments) {
      const clinician = appointments[clinicianId];
      
      if (clinician && clinician.name) {
        cliniciansProcessed++;
        
        // Extract the main name part before commas, titles, etc.
        let cleanName = clinician.name.split(',')[0].trim();
        
        // Remove any titles that might be at the end but without a comma
        cleanName = cleanName.replace(/(PhD|Psy\.D\.|\bDr\.|\bMD|\bLCSW|\bLMSW|\bPsychologist|\bCounselor|\LSW|\bTherapist|\bMFT|\bLPC)$/i, '').trim();
        
        // Remove common suffixes if they're present without a comma
        cleanName = cleanName.replace(/(Jr\.?|Sr\.?|I{1,3}|IV|V|VI)$/i, '').trim();
        
        // Remove Remote suffix
        cleanName = cleanName.replace(/\s-\sRemote$/i, '').trim();
        
        // Remove extra spaces
        cleanName = cleanName.replace(/\s+/g, ' ').trim();
        
        // Create alphanumeric-only version (no spaces or special chars)
        const alphaNumericName = cleanName.replace(/[^a-zA-Z0-9]/g, '');
        
        // Store both versions
        clinician.cleanName = cleanName;
        clinician.searchableName = alphaNumericName;
      }
    }
    
    // Write the updated data back to the file
    await fs.writeFile(appointmentsPath, JSON.stringify(appointments, null, 2));
    
    log(`Successfully cleaned names for ${cliniciansProcessed} clinicians`, 'success');
    return true;
  } catch (error) {
    log(`Error cleaning clinician names: ${error.message}`, 'error');
    throw error;
  }
}

// Run the function if this script is called directly
if (require.main === module) {
  cleanClinicianNames().catch(error => {
    log(`Unhandled error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { cleanClinicianNames };