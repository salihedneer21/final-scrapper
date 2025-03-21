const express = require('express');
const router = express.Router();
const formSubmitter = require('../services/formSubmitter');
const { connectToDatabase } = require('../services/dbService');
const AppointmentStatus = require('../models/AppointmentStatus');
const BookingsLogs = require('../models/BookingsLogs');
const { google } = require('googleapis');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Increased to 50MB per file
    files: 2 // Maximum 2 files
  }
});
const stream = require('stream');

const credentials = require('../jsonfiles/credentials.json');

// Add column headers definition
const SHEET_HEADERS = [
  'AppointmentID',
  'FirstName',
  'LastName',
  'DateOfBirth',
  'Phone',
  'Email',
  'AppointmentURL',
  'ClinicianID',
  'ClinicianName',
  'AppointmentType',
  'AppointmentDate',
  'AppointmentTime',
  'Status',
  'Insurance',
  'MemberID', 
  'PreviousTherapy',
  'TakingMedication',
  'MentalHealthDiagnosis',
  'HasPsychiatricHospitalization', // This is correct
  'PsychiatricHospitalization', 
  'ReasonForTherapy',
  'SubmittedAt',
  'DocumentURLs'
];

const spreadsheetId = '15p2BJh0PAWtuuTwHE30lY4q0ULiLf7xgA13sC62GMsE';
const range = 'Sheet1';

async function appendToGoogleSheet(data) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // First, check if headers exist
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${range}!1:1`,
  });

  const requests = [];
  let headersAdded = false;

  // If no headers or sheet is empty, add headers first
  if (!response.data.values || response.data.values.length === 0) {
    requests.push({
      spreadsheetId,
      range: `${range}!1:1`,
      valueInputOption: 'RAW',
      resource: {
        values: [SHEET_HEADERS],
      },
    });
    headersAdded = true;
  }

  // Add the data
  requests.push({
    spreadsheetId,
    range: `${range}!A${response.data.values ? response.data.values.length + 1 : 2}`,
    valueInputOption: 'RAW',
    resource: {
      values: [data],
    },
  });

  try {
    // Execute all requests sequentially
    for (const request of requests) {
      await sheets.spreadsheets.values.append(request);
    }
    
    // Apply styling to headers if they were just added
    if (headersAdded) {
      await applyHeaderStyling(sheets);
    }
    
    console.log('Data appended successfully to Google Sheet');
    return true;
  } catch (error) {
    console.error('Error appending data to Google Sheet:', error);
    throw error;
  }
}

async function applyHeaderStyling(sheets) {
  try {
    // Get the sheet ID first
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [range],
      fields: 'sheets.properties'
    });
    
    const sheetId = sheetMetadata.data.sheets[0].properties.sheetId;
    
    // Apply styling with batchUpdate
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Set header background color
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.31,
                    green: 0.5,
                    blue: 0.72,
                  },
                  textFormat: {
                    bold: true,
                    foregroundColor: {
                      red: 1.0,
                      green: 1.0,
                      blue: 1.0,
                    },
                    fontSize: 12
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  padding: {
                    top: 5,
                    right: 5,
                    bottom: 5,
                    left: 5
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
            }
          },
          // Freeze the header row
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: {
                  frozenRowCount: 1
                }
              },
              fields: 'gridProperties.frozenRowCount'
            }
          },
          // Auto-resize columns to fit content
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: SHEET_HEADERS.length
              }
            }
          },
          // Add borders to header cells
          {
            updateBorders: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: SHEET_HEADERS.length
              },
              top: {
                style: 'SOLID',
                width: 2,
                color: { red: 0.2, green: 0.2, blue: 0.2 }
              },
              bottom: {
                style: 'SOLID',
                width: 2,
                color: { red: 0.2, green: 0.2, blue: 2 }
              },
              innerHorizontal: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.2, green: 0.2, blue: 0.2 }
              },
              innerVertical: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.2, green: 0.2, blue: 0.2 }
              }
            }
          }
        ]
      }
    });
    
    console.log('Header styling applied successfully');
  } catch (error) {
    console.error('Error applying header styling:', error);
  }
}

// Add this helper function to update Google Sheets
async function updateSheetRow(sheets, appointmentUrl, newStatus) {
  try {
    // First, find the row with matching AppointmentURL
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${range}!A:U`, // Assuming columns A through U contain our data
    });

    const rows = response.data.values;
    if (!rows) return false;

    // Find the index of AppointmentURL column (should be column I, index 8)
    const urlColumnIndex = 8;
    // Find the index of Status column (should be column O, index 14)
    const statusColumnIndex = 14;

    // Find the row with matching appointmentUrl
    const rowIndex = rows.findIndex(row => row[urlColumnIndex] === appointmentUrl);
    if (rowIndex === -1) return false;

    // Update the status in the found row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${range}!O${rowIndex + 1}`, // +1 because Sheets is 1-based
      valueInputOption: 'RAW',
      resource: {
        values: [[newStatus]]
      }
    });

    return true;
  } catch (error) {
    console.error('Error updating sheet row:', error);
    return false;
  }
}

// Helper function to check if slot is available in BookingsLogs
async function checkSlotAvailability(href) {
  try {
    // Extract clinician ID from href
    const clinicianId = href ? formSubmitter.extractClinicianId(href) : '';
    if (!clinicianId) {
      console.log('No clinician ID found in URL');
      return { isAvailable: false, error: 'No clinician ID found in URL' };
    }
    
    // Find the clinician document
    const clinician = await BookingsLogs.findOne({ clinicianId }).exec();
    if (!clinician || !clinician.slots) {
      console.log(`No clinician found with ID ${clinicianId} or no slots array`);
      return { isAvailable: false, error: 'Clinician not found' };
    }
    
    // Find the slot with the matching href
    const slot = clinician.slots.find(slot => slot && slot.href === href);
    if (!slot) {
      console.log(`No slot found with href ${href} for clinician ${clinicianId}`);
      return { isAvailable: false, error: 'Slot not found' };
    }
    
    // Check if slot is listed (available)
    const isAvailable = slot.status === 'listed';
    return { 
      isAvailable, 
      slotStatus: slot.status,
      slot
    };
  } catch (error) {
    console.error(`Error checking slot availability: ${error.message}`);
    return { isAvailable: false, error: error.message };
  }
}

// Helper function to update slot status in BookingsLogs
async function updateBookingsLogsStatus(href, status = 'booked') {
  try {
    // Extract clinician ID from href
    const clinicianId = href ? formSubmitter.extractClinicianId(href) : '';
    if (!clinicianId) {
      console.log('No clinician ID found in URL');
      return false;
    }
    
    console.log(`Updating slot status: href=${href}, clinicianId=${clinicianId}, newStatus=${status}`);
    
    // DIRECT DATABASE UPDATE: Using MongoDB's native operators for more reliability
    // This approach is more reliable for updating nested array elements
    const updateResult = await BookingsLogs.updateOne(
      { 
        clinicianId: clinicianId,
        "slots.href": href
      },
      {
        $set: { "slots.$.status": status }
      }
    );
    
    console.log(`Update result: matchedCount=${updateResult.matchedCount}, modifiedCount=${updateResult.modifiedCount}`);
    
    if (updateResult.matchedCount === 0) {
      console.error(`No document found matching clinicianId=${clinicianId} and href=${href}`);
      return false;
    }
    
    if (updateResult.modifiedCount === 0) {
      // No modification could mean either: already had the status, or failed to update
      // Let's verify the current status
      const clinician = await BookingsLogs.findOne({ clinicianId }).exec();
      if (!clinician || !clinician.slots) {
        console.error(`Could not find clinician with ID ${clinicianId} after update attempt`);
        return false;
      }
      
      const slot = clinician.slots.find(s => s && s.href === href);
      if (!slot) {
        console.error(`Could not find slot with href ${href} after update attempt`);
        return false;
      }
      
      if (slot.status === status) {
        console.log(`Slot already had status '${status}', no update was needed`);
        return true; // Consider it a success if the status is already what we want
      } else {
        console.error(`Failed to update status. Current status is '${slot.status}'`);
        return false;
      }
    }
    
    // Verify the update was successful
    const clinician = await BookingsLogs.findOne({ clinicianId }).exec();
    const slot = clinician?.slots?.find(s => s && s.href === href);
    
    if (!slot) {
      console.error(`Could not find slot after update`);
      return false;
    }
    
    console.log(`✅ VERIFIED: Slot status successfully updated to '${slot.status}'`);
    return slot.status === status;
  } catch (error) {
    console.error(`Error updating BookingsLogs status: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Ensure database connection before handling requests
router.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection error'
    });
  }
});

// Add this function to handle Google Drive file upload
async function uploadToDrive(file) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  const drive = google.drive({ version: 'v3', auth });
  
  const bufferStream = new stream.PassThrough();
  bufferStream.end(file.buffer);
  
  const { data } = await drive.files.create({
    media: {
      mimeType: file.mimetype,
      body: bufferStream,
    },
    requestBody: {
      name: file.originalname,
      parents: ['1VFNjXkQ_3QBG6K1wUgF5JXt7jPl0TnQg'], // Replace with your folder ID
    },
    fields: 'id,webViewLink',
  });

  return data.webViewLink;
}

/**
 * @route POST /api/forms/submit
 * @desc Submit an appointment request form after checking BookingsLogs
 * @access Public
 */

router.post('/submit', upload.array('files', 2), async (req, res) => {
  try {
    // Parse the formData JSON string back into an object
    const formData = JSON.parse(req.body.formData);
    const files = req.files;
    const fileUrls = [];

    // Log the received data for debugging
    console.log('Received form data:', formData);
    console.log('Received files:', files?.map(f => f.originalname));

    const { href } = req.body;
    const requestId = Date.now().toString();
    
    console.log(`[${requestId}] Received form submission request for URL: ${href}`);
    
    // Upload files to Google Drive
    if (files && files.length > 0) {
      for (const file of files) {
        const fileUrl = await uploadToDrive(file);
        fileUrls.push(fileUrl);
      }
    }
    
    // Map frontend form fields to database schema fields
    const appointmentData = {
      // Personal information
      firstName: formData['first-name'],
      middleName: formData['middle-name'] || "",
      lastName: formData['last-name'],
      preferredName: formData['preferred-name'] || "",
      dateOfBirth: formData['dob'],
      phone: formData['mobile'],
      email: formData['email'],
      
      // Appointment information
      href: href,
      clinicianId: formSubmitter.extractClinicianId(href),
      clinicianName: formData.selectedProviderName || "",
      appointmentType: formData.location || "In-person",
      appointmentDate: formData.selectedDate || "",
      appointmentTime: formData.selectedTimeSlot?.time || "",
      
      // Insurance information
      insurance: formData['insurance'],
      memberId: formData['member-id'],
      
      // Mental health information
      previousTherapy: formData['previous-therapy'],
      takingMedication: formData['taking-medication'],
      mentalHealthDiagnosis: formData['mental-diagnosis'] || "",
      hasMedicationHistory: formData['has-medication-history'], // Make sure this matches
      medicationHistory: formData['medication-history'],
      reasonForTherapy: formData['reason'],
      
      // Additional notes
      comments: formData['message'] || "",
      
      // Processing data
      status: 'unknown',
      submittedAt: new Date(),
      processingLog: [{
        status: 'received',
        timestamp: new Date(),
        message: 'Appointment form received'
      }],
      
      // File URLs
      fileUrls: fileUrls
    };

    // Remove unnecessary logging
    console.log('Processing appointment data:', {
      insurance: appointmentData.insurance,
      memberId: appointmentData.memberId,
      fileUrls: appointmentData.fileUrls
    });

    // Validate required fields based on schema
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'phone', 'email',
      'previousTherapy', 'takingMedication', 'reasonForTherapy'
    ];
    
    const missingFields = requiredFields.filter(field => !appointmentData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    if (!href || !href.includes('therapyportal.com')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid appointment URL (href) is required' 
      });
    }
    
    // FIRST CHECK: Skip if appointment is already booked in AppointmentStatus
    const existingAppointment = await AppointmentStatus.findOne({ href }).exec();
    if (existingAppointment && existingAppointment.status === 'booked') {
      console.log(`[${requestId}] SKIPPING: Appointment is already marked as booked in AppointmentStatus`);
      
      // Update BookingsLogs for consistency
      await updateBookingsLogsStatus(href, 'booked');
      
      return res.status(409).json({
        success: false,
        message: 'This appointment slot is already booked in our records',
        alreadyBooked: true
      });
    }
    
    // STEP 1: Update BookingsLogs first - mark the slot as booked immediately
    const updateResult = await updateBookingsLogsStatus(href, 'booked');
    if (!updateResult) {
      console.error(`[${requestId}] Failed to update BookingsLogs status to booked`);
      
      // Try an alternative approach using MongoDB updateOne
      try {
        const clinicianId = formSubmitter.extractClinicianId(href);
        if (clinicianId) {
          console.log(`[${requestId}] Trying alternative update method for clinicianId: ${clinicianId}`);
          
          const updateOperation = await BookingsLogs.updateOne(
            { 
              clinicianId: clinicianId,
              "slots.href": href
            },
            {
              $set: { "slots.$.status": "booked" }
            }
          );
          
          console.log(`[${requestId}] Alternative update result:`, {
            matched: updateOperation.matchedCount,
            modified: updateOperation.modifiedCount
          });
          
          if (updateOperation.modifiedCount === 0) {
            return res.status(400).json({
              success: false,
              message: 'Failed to mark slot as booked in BookingsLogs',
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: 'Could not extract clinician ID from URL',
          });
        }
      } catch (altError) {
        console.error(`[${requestId}] Alternative update approach failed:`, altError.message);
        
        return res.status(500).json({
          success: false,
          message: 'Failed to mark slot as booked',
        });
      }
    }
    
    console.log(`[${requestId}] Successfully marked slot as booked in BookingsLogs`);
    
    // STEP 2: Now record in AppointmentStatus with 'unknown' status
    try {
      // Create new appointment document with the enhanced schema
      const appointment = new AppointmentStatus(appointmentData);
      await appointment.save();
      
      console.log(`[${requestId}] Successfully recorded appointment in AppointmentStatus with 'unknown' status`);
      
      // Prepare data for Google Sheets
      const sheetData = [
        appointment._id,
        appointment.firstName,
        appointment.lastName,
        appointment.dateOfBirth,
        appointment.phone,
        appointment.email,
        appointment.href,
        appointment.clinicianId,
        appointment.clinicianName,
        appointment.appointmentType,
        appointment.appointmentDate,
        appointment.appointmentTime,
        appointment.status,
        appointment.insurance,
        appointment.memberId,
        appointment.previousTherapy,
        appointment.takingMedication,
        appointment.mentalHealthDiagnosis,
        appointment.hasMedicationHistory,
        appointment.medicationHistory,
        appointment.reasonForTherapy,
        appointment.submittedAt,
        fileUrls.join(', ')
      ];
      
      // Append data to Google Sheets
      await appendToGoogleSheet(sheetData);
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Appointment request has been queued for processing',
        status: 'unknown',
        bookingStatus: 'Slot marked as booked',
        appointmentId: appointment._id,
        fileUrls: fileUrls  // Return file URLs in response
      });
    } catch (dbError) {
      console.error(`[${requestId}] Failed to record appointment in AppointmentStatus: ${dbError.message}`);
      
      // Even if this fails, we don't roll back the BookingsLogs status update
      // because the slot is effectively booked now
      return res.status(500).json({
        success: false,
        message: `Slot marked as booked, but failed to record patient details: ${dbError.message}`
      });
    }
  } catch (error) {
    console.error(`Error in form submission:`, error.message);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

/**
 * @route POST /api/forms/process-unknown
 * @desc Process all appointments with 'unknown' status
 * @access Private (Consider adding authentication)
 */
router.post('/process-unknown', async (req, res) => {
  try {
    const requestId = Date.now().toString();
    console.log(`[${requestId}] Starting to process unknown status appointments...`);
    
    // Find all appointments with unknown status
    const unknownAppointments = await AppointmentStatus.find({ status: 'unknown' }).exec();
    
    if (unknownAppointments.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No unknown appointments to process',
        total: 0
      });
    }
    
    console.log(`[${requestId}] Found ${unknownAppointments.length} appointments with unknown status`);
    
    // Start processing, but don't wait for completion
    // This immediately returns a response while processing continues in the background
    res.status(202).json({
      success: true,
      message: `Processing ${unknownAppointments.length} unknown appointments in the background`,
      total: unknownAppointments.length
    });
    
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Process each appointment asynchronously (after response is sent)
    let successCount = 0;
    let failCount = 0;
    let alreadyBookedCount = 0;
    
    for (const appointment of unknownAppointments) {
      console.log(`[${requestId}] Processing appointment for ${appointment.firstName} ${appointment.lastName} (${appointment.href})`);
      
      try {
        // Create formData object from appointment
        const formData = {
          firstName: appointment.firstName || 'Unknown',
          lastName: appointment.lastName || 'Patient',
          middleName: appointment.middleName || '',
          preferredName: appointment.preferredName || '',
          dateOfBirth: appointment.dateOfBirth || '',
          phone: appointment.phone || '',
          email: appointment.email || '',
          comments: appointment.comments || ''
        };
        
        // Submit the form
        const result = await formSubmitter.submitAppointmentForm(formData, appointment.href);
        
        if (result.success) {
          console.log(`[${requestId}] Successfully processed appointment ${appointment.href}`);
          // Update BookingsLogs status
          await updateBookingsLogsStatus(appointment.href, 'booked');
          // Update Google Sheet
          await updateSheetRow(sheets, appointment.href, 'booked');
          successCount++;
        } else if (result.alreadyBooked) {
          console.log(`[${requestId}] Appointment ${appointment.href} is already booked on the website`);
          // Update AppointmentStatus and BookingsLogs
          await formSubmitter.recordAppointment(formData, appointment.href, 'booked');
          await updateBookingsLogsStatus(appointment.href, 'booked');
          // Update Google Sheet
          await updateSheetRow(sheets, appointment.href, 'booked');
          alreadyBookedCount++;
        } else {
          console.log(`[${requestId}] Failed to process appointment ${appointment.href}: ${result.message}`);
          // Update Google Sheet to mark as expired/failed
          await updateSheetRow(sheets, appointment.href, 'expired');
          failCount++;
        }
      } catch (error) {
        console.error(`[${requestId}] Error processing appointment ${appointment.href}: ${error.message}`);
        // Update Google Sheet to mark as failed
        await updateSheetRow(sheets, appointment.href, 'failed');
        failCount++;
      }
      
      // Wait between submissions to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log(`[${requestId}] Finished processing. Success: ${successCount}, Already Booked: ${alreadyBookedCount}, Failed: ${failCount}`);
    
  } catch (error) {
    console.error('Error processing unknown appointments:', error);
    // Response already sent, so just log the error
  }
});

/**
 * @route GET /api/forms/unknown-count
 * @desc Get the count of appointments with 'unknown' status
 * @access Public
 */
router.get('/unknown-count', async (req, res) => {
  try {
    const count = await AppointmentStatus.countDocuments({ status: 'unknown' }).exec();
    
    return res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error counting unknown appointments:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

/**
 * @route POST /api/forms/check-availability
 * @desc Check if an appointment slot is available
 * @access Public
 */
router.post('/check-availability', async (req, res) => {
  try {
    const { href } = req.body;
    const requestId = Date.now().toString();
    
    console.log(`[${requestId}] Checking availability for URL: ${href}`);
    
    if (!href || !href.includes('therapyportal.com')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid appointment URL (href) is required' 
      });
    }
    
    // Check if already booked in AppointmentStatus
    const existingAppointment = await AppointmentStatus.findOne({ href }).exec();
    if (existingAppointment && existingAppointment.status === 'booked') {
      console.log(`[${requestId}] Appointment is marked as booked in AppointmentStatus`);
      return res.status(200).json({
        success: true,
        isAvailable: false,
        isBooked: true,
        source: 'AppointmentStatus'
      });
    }
    
    // Check availability in BookingsLogs
    const slotAvailability = await checkSlotAvailability(href);
    if (slotAvailability.slot) {
      const isAvailableInBookingsLogs = slotAvailability.slotStatus === 'listed';
      
      if (!isAvailableInBookingsLogs) {
        console.log(`[${requestId}] Slot is not available in BookingsLogs. Status: ${slotAvailability.slotStatus}`);
        return res.status(200).json({
          success: true,
          isAvailable: false,
          isBooked: slotAvailability.slotStatus === 'booked',
          source: 'BookingsLogs',
          status: slotAvailability.slotStatus
        });
      }
      
      console.log(`[${requestId}] Slot is available in BookingsLogs (status: listed)`);
      return res.status(200).json({
        success: true,
        isAvailable: true,
        isBooked: false,
        source: 'BookingsLogs'
      });
    }
    
    // If we couldn't determine from our databases, check the website
    console.log(`[${requestId}] Checking availability on the website...`);
    const isBooked = await formSubmitter.checkIfSlotBooked(href);
    
    return res.status(200).json({
      success: true,
      isAvailable: !isBooked,
      isBooked: isBooked,
      source: 'website'
    });
    
  } catch (error) {
    console.error('Error checking availability:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
});

module.exports = router;