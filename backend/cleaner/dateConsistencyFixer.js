const fs = require('fs').promises;
const path = require('path');
const CONFIG = require('../config');

/**
 * Fixes inconsistencies in date field based on isoDate while preserving shortDate format
 */
async function fixDateConsistencies() {
  const appointmentsPath = path.join(CONFIG.resultsDir, CONFIG.appointmentsFile);
  console.log('Reading appointments data...');
  const rawData = JSON.parse(await fs.readFile(appointmentsPath, 'utf8'));

  let totalSlots = 0;
  let fixedSlots = 0;
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Process each clinician
  for (const [clinicianId, clinician] of Object.entries(rawData)) {
    if (!clinician.slots || !Array.isArray(clinician.slots)) continue;

    console.log(`Processing clinician: ${clinician.name || clinicianId} (${clinician.slots.length} slots)`);

    // Process each slot
    for (const slot of clinician.slots) {
      totalSlots++;
      if (!slot.isoDate) continue;

      try {
        // Parse ISO date (YYYY-MM-DD)
        const [year, month, day] = slot.isoDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        if (isNaN(dateObj.getTime())) {
          console.error(`Invalid isoDate: ${slot.isoDate}`);
          continue;
        }

        // Generate correct date string in the same format
        const dayOfWeek = daysOfWeek[dateObj.getDay()];
        const monthName = months[dateObj.getMonth()];
        const correctDate = `${dayOfWeek}, ${monthName} ${day}, ${year}`;

        // Only update if the date is incorrect
        if (slot.date !== correctDate) {
          console.log(`\nFixing date inconsistency:`);
          console.log(`  Current date: ${slot.date || 'missing'}`);
          console.log(`  Correct date: ${correctDate}`);
          console.log(`  Based on isoDate: ${slot.isoDate}`);
          
          // Only update the date field - shortDate remains unchanged
          slot.date = correctDate;
          fixedSlots++;
        }
      } catch (error) {
        console.error(`Error processing slot:`, error);
      }
    }
  }

  console.log(`\nFinal Report:`);
  console.log(`Total slots processed: ${totalSlots}`);
  console.log(`Slots with fixed dates: ${fixedSlots}`);

  // Write back the corrected data
  await fs.writeFile(appointmentsPath, JSON.stringify(rawData, null, 2));
  console.log('Data saved successfully.');

  return { totalSlots, fixedSlots };
}

// Run the function if this script is called directly
if (require.main === module) {
  fixDateConsistencies()
    .then(({ totalSlots, fixedSlots }) => {
      console.log(`Fixed ${fixedSlots}/${totalSlots} slots.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { fixDateConsistencies };