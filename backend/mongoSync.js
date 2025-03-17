const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const CONFIG = require('./config');
const { connectToDatabase, disconnectFromDatabase } = require('./services/dbService');
const BookingsLogs = require('./models/BookingsLogs');

// Helper function for formatted logging
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌ ERROR' :
        type === 'success' ? '✅ SUCCESS' :
            type === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO';
    console.log(`[${timestamp}] ${prefix}: ${message}`);
}

// Function to ensure a slot has all required fields
function ensureRequiredFields(slot) {
    // Clone the slot to avoid modifying the original
    const completeSlot = { ...slot };
    
    // Ensure required fields are present
    completeSlot.href = completeSlot.href || `https://www.therapyportal.com/p/crownc/appointments/requests/?dummy=${Math.random()}`;
    completeSlot.date = completeSlot.date || "Unknown Date";
    completeSlot.time = completeSlot.time || "Unknown Time";
    completeSlot.status = completeSlot.status || "listed";
    
    // Add default location if missing
    completeSlot.locationId = completeSlot.locationId || "unknown";
    completeSlot.location = completeSlot.location || "Unknown Location";
    
    return completeSlot;
}

// Function to save appointment data to MongoDB
async function saveAppointmentsData(appointmentsData) {
    try {
        let cliniciansProcessed = 0;
        let cliniciansWithError = 0;
        let slotsAdded = 0;
        let slotsFixed = 0;
        let slotsRemoved = 0;
        let slotsKept = 0;

        // Process each clinician in the JSON data
        for (const clinicianId in appointmentsData) {
            const clinician = appointmentsData[clinicianId];

            try {
                // Skip if no name (required field)
                if (!clinician.name) {
                    log(`Skipping clinician ${clinicianId}: Missing name`, 'warning');
                    continue;
                }

                // Check if the clinician has error status at the top level
                const hasErrorStatus = clinician.status === "error";
                
                if (hasErrorStatus) {
                    cliniciansWithError++;
                    log(`Clinician ${clinicianId}: ${clinician.name} has error status - keeping existing document`);
                    
                    // If this is an error clinician, just skip further processing
                    // We don't update anything for error clinicians
                    continue;
                }

                // If no slots, create empty array
                if (!clinician.slots || !Array.isArray(clinician.slots)) {
                    clinician.slots = [];
                }

                // Find existing clinician document or create new one
                let clinicianDoc = await BookingsLogs.findOne({ clinicianId: clinicianId });

                if (!clinicianDoc) {
                    log(`Creating new document for clinician ${clinicianId}: ${clinician.name}`);
                    clinicianDoc = new BookingsLogs({
                        clinicianId: clinicianId,
                        name: clinician.name,
                        cleanName: clinician.cleanName || '',
                        searchableName: clinician.searchableName || '',
                        slots: []
                    });
                } else {
                    log(`Found existing document for clinician ${clinicianId}: ${clinician.name}`);
                    // Update the cleanName and searchableName if they exist in the current data
                    if (clinician.cleanName) {
                        clinicianDoc.cleanName = clinician.cleanName;
                    }
                    if (clinician.searchableName) {
                        clinicianDoc.searchableName = clinician.searchableName;
                    }
                }

                // Create a set of all hrefs from the current appointments.json
                const currentHrefs = new Set(
                    clinician.slots
                        .filter(slot => slot.href)
                        .map(slot => slot.href)
                );
                
                // Track existing hrefs to avoid duplicates during addition
                const existingHrefs = new Set();

                // Filter slots to keep in the database:
                // 1. Keep slots with status "error" regardless of whether they're in the current data
                // 2. Keep slots whose href is in the current data
                const keepSlots = clinicianDoc.slots.filter(slot => {
                    // Always keep slots with error status
                    if (slot.status === "error") {
                        existingHrefs.add(slot.href);
                        slotsKept++;
                        return true;
                    }
                    
                    // Keep slots with hrefs that exist in the current data
                    if (currentHrefs.has(slot.href)) {
                        existingHrefs.add(slot.href);
                        return true;
                    }
                    
                    // Remove slots not in the current data
                    slotsRemoved++;
                    return false;
                });
                
                // Update the clinician document with just the slots to keep
                clinicianDoc.slots = keepSlots;

                // Process each slot in the current data
                for (const slot of clinician.slots) {
                    // Skip slots without href
                    if (!slot.href) continue;
                    
                    // Skip if this slot already exists in the database
                    if (existingHrefs.has(slot.href)) continue;

                    // Ensure slot has all required fields
                    const completeSlot = ensureRequiredFields(slot);
                    
                    // Check if missing location or locationId
                    if (!slot.locationId || !slot.location) {
                        slotsFixed++;
                    }

                    // Add the slot to the database
                    clinicianDoc.slots.push({
                        href: completeSlot.href,
                        date: completeSlot.date,
                        time: completeSlot.time,
                        status: completeSlot.status,
                        locationId: completeSlot.locationId,
                        location: completeSlot.location,
                        shortDate: completeSlot.shortDate,
                        isoDate: completeSlot.isoDate
                    });
                    
                    existingHrefs.add(completeSlot.href);
                    slotsAdded++;
                }

                // Save updated document
                await clinicianDoc.save();
                cliniciansProcessed++;

            } catch (error) {
                log(`Error processing clinician ${clinicianId}: ${error.message}`, 'error');
            }
        }

        log(`MongoDB sync complete:
- Clinicians processed: ${cliniciansProcessed}
- Clinicians with error status preserved: ${cliniciansWithError}
- New slots added: ${slotsAdded}
- Slots with fixed missing fields: ${slotsFixed}
- Slots removed (no longer in source data): ${slotsRemoved}
- Error slots kept: ${slotsKept}`, 'success');

    } catch (error) {
        log(`Error saving appointments data: ${error.message}`, 'error');
        throw error;
    }
}

// Main function to sync data with MongoDB
async function syncWithMongoDB() {
    try {
        log('Starting MongoDB synchronization...');

        // Connect to MongoDB
        const connected = await connectToDatabase();
        if (!connected) {
            throw new Error('Failed to connect to MongoDB');
        }

        // Read the appointments data
        const appointmentsFilePath = path.join(CONFIG.resultsDir, CONFIG.appointmentsFile);
        log(`Reading appointments data from ${appointmentsFilePath}`);

        const data = await fs.readFile(appointmentsFilePath, 'utf8');
        const appointmentsData = JSON.parse(data);

        // Save appointments data
        await saveAppointmentsData(appointmentsData);

        log('MongoDB synchronization completed successfully', 'success');
        return true;
    } catch (error) {
        log(`Error in MongoDB synchronization: ${error.message}`, 'error');
        return false;
    } finally {
        // Only disconnect if we're running as a standalone script
        if (require.main === module) {
            await disconnectFromDatabase();
        }
    }
}

// If this script is run directly
if (require.main === module) {
    syncWithMongoDB().catch(error => {
        log(`Unhandled error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { syncWithMongoDB };