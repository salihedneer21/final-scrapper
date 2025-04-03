import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Calendar from './CalendarAll';
import AppointmentForm from './AppointmentForm';
import { format, parseISO } from 'date-fns';
import { Clock, MapPin, Video, User, ChevronLeft, Calendar as CalendarIcon, Phone } from 'lucide-react';

function AllBookings() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState({});
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailySlots, setDailySlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [slotDetails, setSlotDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [filters] = useState({
    status: 'listed',
  });
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [selectedProviderName, setSelectedProviderName] = useState('');
  const [selectedStep, setSelectedStep] = useState('date'); // 'date', 'time', 'provider'
  const [loadingSlotDetails, setLoadingSlotDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const providersPerPage = windowWidth <= 640 ? 2 : 4; // Show 2 on mobile, 4 on larger screens

  // Using the original website color
  const primaryColor = 'rgb(119, 168, 195)';

  useEffect(() => {
    fetchAllBookings();
    
    // Add window resize listener to adjust providers per page dynamically
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchAllBookings = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      const response = await fetch(`https://automate.crowncounseling.com/api/allbookings?${queryParams}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setErrorMessage('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setTimeSlots([]);
    setSlotDetails(null); // Ensure slot details are cleared
    setErrorMessage(''); // Clear any existing error messages
    setSelectedStep('time'); // Move to time selection step
    
    const dateString = format(date, 'yyyy-MM-dd');
    if (bookings.slotsByDate && bookings.slotsByDate[dateString]) {
      const slots = bookings.slotsByDate[dateString];
      setDailySlots(slots);
      
      const uniqueTimes = [];
      const timeMap = {};
      
      slots.forEach(slot => {
        const slotDateTime = new Date(date);
        const [hours, minutes] = slot.time.split(':');
        slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
        
        if (!timeMap[slot.time]) {
          timeMap[slot.time] = true;
          uniqueTimes.push(slot.time);
        }
      });
      
      // Sort times by AM/PM, then by hour and minute
      uniqueTimes.sort((a, b) => {
        // Check if time contains AM or PM
        const aHasAM = a.includes('AM');
        const aHasPM = a.includes('PM');
        const bHasAM = b.includes('AM');
        const bHasPM = b.includes('PM');
        
        // If one has AM and one has PM, AM comes first
        if (aHasAM && bHasPM) return -1;
        if (aHasPM && bHasAM) return 1;
        
        // Extract hours and minutes
        let aHours, aMinutes, bHours, bMinutes;
        
        if (aHasAM || aHasPM) {
          // Time with AM/PM format
          const timePart = a.replace(/(AM|PM)/, '').trim();
          [aHours, aMinutes] = timePart.split(':').map(Number);
          // Adjust hours for PM times (except 12 PM)
          if (aHasPM && aHours !== 12) aHours += 12;
          // Special case: 12 AM should be treated as 0
          if (aHasAM && aHours === 12) aHours = 0;
        } else {
          // 24-hour format
          [aHours, aMinutes] = a.split(':').map(Number);
        }
        
        if (bHasAM || bHasPM) {
          // Time with AM/PM format
          const timePart = b.replace(/(AM|PM)/, '').trim();
          [bHours, bMinutes] = timePart.split(':').map(Number);
          // Adjust hours for PM times (except 12 PM)
          if (bHasPM && bHours !== 12) bHours += 12;
          // Special case: 12 AM should be treated as 0
          if (bHasAM && bHours === 12) bHours = 0;
        } else {
          // 24-hour format
          [bHours, bMinutes] = b.split(':').map(Number);
        }
        
        // Compare hours first
        if (aHours !== bHours) {
          return aHours - bHours;
        }
        
        // If hours are equal, compare minutes
        return (aMinutes || 0) - (bMinutes || 0);
      });
      
      setTimeSlots(uniqueTimes);
    } else {
      setDailySlots([]);
      setTimeSlots([]);
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setSelectedStep('provider');
    // Reset slot details immediately and set loading state
    setSlotDetails(null);
    setLoadingSlotDetails(true);
    setCurrentPage(0); // Reset to first page
    
    const matchingSlots = dailySlots.filter(slot => slot.time === time);
    
    // Check if appointment is within 24 hours
    const slotDateTime = new Date(selectedDate);
    const [hours, minutes] = time.split(':');
    slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
    
    const now = new Date();
    const timeDifference = slotDateTime - now;
    const isWithin24Hours = timeDifference > 0 && timeDifference < 24 * 60 * 60 * 1000;
    
    // Always fetch the provider details regardless of time constraint
    Promise.all(matchingSlots.map(slot => 
      fetch(`https://automate.crowncounseling.com/api/slots/${slot.id}`)
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch slot details');
          return response.json();
        })
    ))
      .then(detailsArray => {
        // Add the isWithin24Hours flag to each detail object
        const updatedDetailsArray = detailsArray.map(detail => ({
          ...detail,
          isWithin24Hours
        }));
        setSlotDetails(updatedDetailsArray);
        setLoadingSlotDetails(false); // Turn off loading state
        setErrorMessage('');
      })
      .catch(error => {
        console.error('Error fetching slot details:', error);
        setErrorMessage('Failed to load slot details. Please try again.');
        setLoadingSlotDetails(false); // Turn off loading state even on error
      });
  };

  // Function to determine if appointment is telehealth or in-person
  const getAppointmentType = (location) => {
    return location.toLowerCase().includes("virtual") || 
           location.toLowerCase().includes("online") || 
           location.toLowerCase().includes("telehealth") ? "Telehealth" : "In Person";
  };
  
  const handleBookAppointment = (details) => {
    if (!details.href) {
      console.error("Missing href in appointment details:", details);
      setErrorMessage("Unable to book appointment: Missing appointment URL");
      return;
    }
    
    setSelectedBooking({
      providerName: details.doctorName,
      date: selectedDate,
      timeSlot: {
        time: details.time,
        location: details.location,
        href: details.href
      }
    });
    setShowAppointmentForm(true);
  };
  
  const handleCancelAppointment = () => {
    setShowAppointmentForm(false);
    setSelectedBooking(null);
  };
  
  const handleSubmitAppointment = async (e, responseData = null) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      if (responseData) {
        console.log('Appointment submitted successfully:', responseData);
        setSelectedProviderName(selectedBooking.providerName); // Set provider name
        
        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set submission complete
        setSubmissionComplete(true);
        
        // Optionally reset other states
        setShowAppointmentForm(false);
        setSelectedBooking(null);
      } else {
        console.warn('handleSubmitAppointment called without API response data');
        throw new Error('No response data received');
      }
    } catch (error) {
      console.error('Error handling submission:', error);
      setErrorMessage('Failed to process appointment submission');
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-gray-200"
            style={{ borderTopColor: primaryColor }}
          />
          <p className="text-gray-600 font-medium">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  if (showAppointmentForm && selectedBooking) {
    return (
      <div className="min-h-screen  py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AppointmentForm 
            selectedProviderName={selectedBooking.providerName}
            selectedDate={selectedBooking.date}
            selectedTimeSlot={selectedBooking.timeSlot}
            handleCancelAppointment={handleCancelAppointment}
            handleSubmitAppointment={handleSubmitAppointment}
            isSubmitting={isSubmitting}
            primaryColor={primaryColor}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {isSubmitting && submissionComplete ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg p-8"
          >
            <div className="flex flex-col items-center">
              <div className="mb-6 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
  
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Appointment Request Submitted
              </h2>
  
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-center">
                <p className="text-green-800">
                  Your request for an appointment on{' '}
                  {selectedDate?.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  at {selectedBooking?.timeSlot?.time} with {selectedProviderName} has been submitted.
                </p>
                <p className="text-green-700 mt-4">
                  <strong>Please note:</strong> This is not a confirmed appointment. Our team will review your request 
                  and send you an email confirmation once it has been approved and scheduled.
                </p>
              </div>
            </div>
          </motion.div>
        ) : isSubmitting ? (
          <div className="bg-white rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <div
              className="w-16 h-16 border-4 border-t-4 border-gray-200 rounded-full mb-4 animate-spin"
              style={{ borderTopColor: primaryColor }}
            ></div>
            <p className="text-gray-600 text-center">Processing your appointment request...</p>
          </div>
        ) : (
          <motion.div>
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 text-center"
            >

            </motion.div>
            
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg bg-red-50 border-l-4 border-red-400 text-red-700"
              >
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{errorMessage}</p>
              </motion.div>
            )}
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Calendar Section */}
              <motion.div 
                variants={itemVariants}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${selectedStep !== 'date' ? 'hidden' : ''}`}
              >
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <CalendarIcon size={20} style={{ color: primaryColor }} />
                    <h2 className="text-xl font-medium" style={{ color: primaryColor }}>Select Date</h2>
                  </div>
                  
                  {bookings.slotsByDate && (
                    <Calendar
                      currentWeekStart={currentWeekStart}
                      setCurrentWeekStart={setCurrentWeekStart}
                      selectedDate={selectedDate}
                      handleDateSelect={(date) => {
                        handleDateSelect(date);
                        setSelectedStep('time');
                      }}
                      primaryColor={primaryColor}
                      slots={Object.values(bookings.slotsByDate).flat()}
                    />
                  )}
                </div>
              </motion.div>
              
              {/* Time Slots Section */}
              <motion.div 
                variants={itemVariants}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${selectedStep !== 'time' ? 'hidden' : ''}`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setSelectedStep('date')}
                        className="flex items-center text-gray-500 hover:text-gray-700"
                      >
                        <ChevronLeft size={16} />
                        <span className="text-sm">Back to calendar</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={20} style={{ color: primaryColor }} />
                      <h2 className="text-xl font-medium" style={{ color: primaryColor }}>Available Times</h2>
                    </div>
                  </div>
                  
                  {selectedDate && (
                    <div className="mb-4 px-2 py-1 bg-gray-50 rounded-md inline-block">
                      <div className="text-sm text-gray-500">
                        {selectedDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  )}
                  
                  {timeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {timeSlots.map((time) => (
                        <motion.div
                          key={time}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            handleTimeSelect(time);
                            setSelectedStep('provider');
                          }}
                          className={`p-3 rounded-md text-center cursor-pointer transition-all duration-200`}
                          style={{ 
                            backgroundColor: selectedTime === time ? primaryColor : '#F9FAFB',
                            color: selectedTime === time ? 'white' : '#4B5563',
                            border: `1px solid ${selectedTime === time ? primaryColor : '#E5E7EB'}`,
                            boxShadow: selectedTime === time ? '0 4px 6px -1px rgba(119, 168, 195, 0.3)' : 'none'
                          }}
                        >
                          <div className="font-medium text-sm">{time}</div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Clock size={40} className="mb-3 text-gray-300" />
                      <p className="text-gray-500">No slots available for this date</p>
                    </div>
                  )}
                </div>
              </motion.div>
              
              {/* Provider Options Section */}
              <motion.div 
                variants={itemVariants}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${selectedStep !== 'provider' ? 'hidden' : ''}`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setSelectedStep('time')}
                        className="flex items-center text-gray-500 hover:text-gray-700"
                      >
                        <ChevronLeft size={16} />
                        <span className="text-sm">Back to times</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User size={20} style={{ color: primaryColor }} />
                      <h2 className="text-xl font-medium" style={{ color: primaryColor }}>Provider Options</h2>
                    </div>
                  </div>
                  
                  {selectedDate && selectedTime && (
                    <div className="mb-4 px-2 py-1 bg-gray-50 rounded-md inline-block">
                      <div className="text-sm text-gray-500">
                        {selectedDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })} at {selectedTime}
                      </div>
                    </div>
                  )}
                  
                  {!slotDetails && loadingSlotDetails ? (
                    <div className="flex items-center justify-center py-10">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-10 h-10 rounded-full border-2 border-gray-200"
                        style={{ borderTopColor: primaryColor }}
                      />
                    </div>
                  ) : !slotDetails ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <User size={40} className="mb-3 text-gray-300" />
                      <p className="text-gray-500">No provider options available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {slotDetails
                          .slice(
                            currentPage * providersPerPage, 
                            (currentPage + 1) * providersPerPage
                          )
                          .map((details, index) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-300"
                              style={{ border: `1px solid rgba(119, 168, 195, 0.2)` }}
                            >
                              <div className="h-2" style={{ backgroundColor: primaryColor }}></div>
                              <div className="p-4">
                                <div className="mb-3">
                                  <div className="flex justify-between items-center">
                                    <div className="font-medium text-gray-800">{details.doctorName}</div>
                                    <div className="text-sm font-medium px-2 py-1 rounded" 
                                      style={{ 
                                        backgroundColor: `${primaryColor}20`, 
                                        color: primaryColor 
                                      }}
                                    >
                                      {details.time}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {format(parseISO(details.isoDate), 'EEEE, MMMM d, yyyy')}
                                  </div>
                                </div>
                                
                                <div className="space-y-3 mb-4">
                                  {getAppointmentType(details.location) === "Telehealth" ? (
                                    <div className="flex items-start">
                                      <Video size={16} className="mr-2 mt-0.5" style={{ color: primaryColor }} />
                                      <div>
                                        <div className="text-sm text-gray-600 font-medium">Telehealth Appointment</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center text-sm text-gray-600">
                                      <MapPin size={16} className="mr-2" style={{ color: primaryColor }} />
                                      <div className="flex items-center">
                                        <span className="font-medium">In-Person</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Within 24 hours message */}
                                  {details.isWithin24Hours && (
                                    <div className="bg-amber-50 rounded p-3 border-l-2 border-amber-400 text-sm text-amber-800">
                                      <p>Cannot be booked within 24 hours. Please select a date next week.</p>
                                    </div>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => details.isWithin24Hours ? null : handleBookAppointment(details)}
                                  disabled={details.isWithin24Hours}
                                  className={`block w-full text-center px-4 py-2 rounded-md text-white font-medium transition-all duration-200 ${
                                    details.isWithin24Hours ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                                  }`}
                                  style={{ 
                                    backgroundColor: primaryColor,
                                    boxShadow: details.isWithin24Hours ? 'none' : '0 2px 4px rgba(119, 168, 195, 0.3)'
                                  }}
                                >
                                  {details.isWithin24Hours ? 'Unavailable' : `Book with ${details.doctorName.split(' ')[0]}`}
                                </button>
                              </div>
                            </motion.div>
                          ))}
                      </div>
              
                      {/* Pagination - only show if we have more than providersPerPage providers */}
                      {slotDetails.length > providersPerPage && (
                        <div className="flex justify-center items-center mt-6 space-x-2">
                          {Array.from({ length: Math.ceil(slotDetails.length / providersPerPage) }).map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentPage(index)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                currentPage === index 
                                  ? 'text-white' 
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              style={{ 
                                backgroundColor: currentPage === index ? primaryColor : 'transparent',
                                border: `1px solid ${currentPage === index ? primaryColor : '#E5E7EB'}`
                              }}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default AllBookings;