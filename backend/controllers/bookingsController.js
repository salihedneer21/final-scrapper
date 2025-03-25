const BookingsLogs = require('../models/BookingsLogs');

// Get all doctors
exports.getDoctors = async (req, res) => {
  try {
    const doctors = await BookingsLogs.find({}, 'clinicianId cleanName searchableName');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available slots for a doctor
exports.getSlots = async (req, res) => {
  const { clinicianId } = req.params;
  try {
    const doctor = await BookingsLogs.findOne({ clinicianId });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Filter out slots that have a status of 'booked'
    const availableSlots = doctor.slots.filter(slot => slot.status !== 'booked');
    
    res.json(availableSlots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all slots across all doctors (for calendar view)
exports.getAllBookings = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { startDate, endDate, startTime, endTime, status } = req.query;
    
    // Build query filter for MongoDB
    const filter = {};
    
    // Find all doctors with their slots
    const doctors = await BookingsLogs.find(filter, 'clinicianId cleanName searchableName name slots');
    
    // Format the data for calendar view
    const formattedBookings = doctors.flatMap(doctor => {
      // Get the doctor's slots
      return doctor.slots
        .filter(slot => {
          // By default, exclude booked slots unless explicitly requested with status=booked or status=''
          if (status === undefined && slot.status === 'booked') return false;
          
          // Apply status filter if provided
          if (status && slot.status !== status) return false;
          
          // Date filtering based on isoDate
          if (startDate || endDate) {
            const slotDate = new Date(slot.isoDate);
            
            if (startDate) {
              const startDateObj = new Date(startDate);
              // Set time to beginning of day for date comparison
              startDateObj.setHours(0, 0, 0, 0);
              slotDate.setHours(0, 0, 0, 0);
              if (slotDate < startDateObj) return false;
            }
            
            if (endDate) {
              const endDateObj = new Date(endDate);
              // Set time to end of day for date comparison
              endDateObj.setHours(23, 59, 59, 999);
              slotDate.setHours(0, 0, 0, 0);
              if (slotDate > endDateObj) return false;
            }
          }
          
          // Time filtering
          if (startTime || endTime) {
            try {
              // Parse the slot time (format: "9:00 AM", "2:30 PM", etc.)
              const timeRegex = /(\d+):(\d+)(?:\s*)(AM|PM)?/i;
              const matches = slot.time.match(timeRegex);
              
              if (!matches) return true; // Skip time filtering if time format doesn't match
              
              let hours = parseInt(matches[1], 10);
              const minutes = parseInt(matches[2], 10);
              const period = matches[3]?.toUpperCase();
              
              // Convert to 24-hour format
              if (period === 'PM' && hours < 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
              
              // Convert to minutes since midnight for easier comparison
              const slotMinutes = hours * 60 + minutes;
              
              // Apply start time filter
              if (startTime) {
                const [startHours, startMinutes] = startTime.split(':').map(num => parseInt(num, 10));
                const startTotalMinutes = startHours * 60 + startMinutes;
                if (slotMinutes < startTotalMinutes) return false;
              }
              
              // Apply end time filter
              if (endTime) {
                const [endHours, endMinutes] = endTime.split(':').map(num => parseInt(num, 10));
                const endTotalMinutes = endHours * 60 + endMinutes;
                if (slotMinutes > endTotalMinutes) return false;
              }
            } catch (err) {
              console.error('Time parsing error:', err);
              // If there's an error parsing the time, include the slot by default
            }
          }
          
          return true;
        })
        .map(slot => {
          // Ensure we have an isoDate format
          let isoDate = slot.isoDate;
          // Create a more consistent shortDate from isoDate (YYYY-MM-DD)
          const shortDate = isoDate;
          
          return {
            id: slot._id,
            doctorId: doctor.clinicianId,
            doctorName: doctor.cleanName || doctor.name,
            time: slot.time,
            location: slot.location,
            status: slot.status,
            isoDate: isoDate,
            shortDate: shortDate,
            href: slot.href
          };
        });
    });
    
    // Sort slots by isoDate and then by time
    formattedBookings.sort((a, b) => {
      // First compare by date
      const dateCompare = a.isoDate.localeCompare(b.isoDate);
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, compare by time
      const aTime = convertTimeToMinutes(a.time);
      const bTime = convertTimeToMinutes(b.time);
      return aTime - bTime;
    });
    
    // Helper function to convert time string to minutes
    function convertTimeToMinutes(timeStr) {
      try {
        const timeRegex = /(\d+):(\d+)(?:\s*)(AM|PM)?/i;
        const matches = timeStr.match(timeRegex);
        
        if (!matches) return 0; // Default value if format doesn't match
        
        let hours = parseInt(matches[1], 10);
        const minutes = parseInt(matches[2], 10);
        const period = matches[3]?.toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      } catch (err) {
        console.error('Time conversion error:', err);
        return 0;
      }
    }
    
    // Helper function to get month number from name
    function getMonthNumber(monthName) {
      const months = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
        'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12,
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'Jun': 6, 'Jul': 7, 
        'Aug': 8, 'Sep': 9, 'Sept': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      return months[monthName] || 1; // Default to January if not found
    }
    
    // Group slots by date for easier calendar rendering
    // Using isoDate format (YYYY-MM-DD) instead of text-based format
    const slotsByDate = formattedBookings.reduce((acc, slot) => {
      const dateKey = slot.isoDate;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {});
    
    res.json({
      totalSlots: formattedBookings.length,
      slotsByDate
    });
  } catch (error) {
    console.error('Error in getAllBookings:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get detailed information for a specific slot
exports.getSlotDetails = async (req, res) => {
  const { slotId } = req.params;
  
  try {
    // Find the doctor document that contains the slot with the provided ID
    const doctor = await BookingsLogs.findOne(
      { "slots._id": slotId },
      { "slots.$": 1, clinicianId: 1, cleanName: 1, name: 1, searchableName: 1 }
    );
    
    if (!doctor || !doctor.slots || doctor.slots.length === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    // Combine doctor info with slot info
    const slot = doctor.slots[0];
    const slotDetails = {
      id: slot._id,
      doctorId: doctor.clinicianId,
      doctorName: doctor.cleanName || doctor.name,
      searchableName: doctor.searchableName,
      time: slot.time,
      isoDate: slot.isoDate,
      shortDate: slot.shortDate,
      location: slot.location,
      locationId: slot.locationId,
      status: slot.status,
      href: slot.href,
      // Determine if the appointment is telephonic based on location
      isTelephonicAppointment: slot.location.toLowerCase().includes('telephonic') || 
                               slot.location.toLowerCase().includes('virtual') ||
                               slot.location.toLowerCase().includes('video')
    };
    
    res.json(slotDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};