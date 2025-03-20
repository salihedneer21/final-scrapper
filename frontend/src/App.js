import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import ProviderDropdown from './ProviderDropdown';
import Calendar from './Calendar';
import AppointmentForm from './AppointmentForm';

function App() {
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedProviderName, setSelectedProviderName] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [hideProviderDropdown, setHideProviderDropdown] = useState(false);
  const [view, setView] = useState('calendar'); // possible values: 'calendar', 'timeSlots'

  // Get clinician name from URL parameter
  const { clinicianName } = useParams();

  const primaryColor = 'rgb(119, 168, 195)';

  // Fetch doctors on component mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch('https://automate.crowncounseling.com/api/doctors');
        const data = await response.json();
        setDoctors(data);

        // Check if we have a clinician parameter in the URL
        if (clinicianName) {
          // First check if it's a clinician ID
          const matchedById = data.find(
            doctor => doctor.clinicianId === clinicianName
          );

          if (matchedById) {
            // If it's an ID match, use it directly
            handleProviderChange(matchedById.clinicianId, matchedById.cleanName);
            setHideProviderDropdown(true);
          } else {
            // If not an ID, try matching by name
            const decodedName = decodeURIComponent(clinicianName).trim();
            const normalizedName = decodedName.replace(/\s+/g, '').toLowerCase();

            const matchedByName = data.find(
              doctor => doctor.searchableName && 
              doctor.searchableName.toLowerCase() === normalizedName
            );

            if (matchedByName) {
              handleProviderChange(matchedByName.clinicianId, matchedByName.cleanName);
              setHideProviderDropdown(true);
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [clinicianName]);

  // Custom provider selection handler
  const handleProviderChange = (providerId, providerName) => {
    setSelectedProvider(providerId);
    setSelectedProviderName(providerName);
    setSelectedDate(null);
    setTimeSlots([]);
    setErrorMessage('');
  };

  // Fetch slots when a provider is selected
  useEffect(() => {
    if (selectedProvider) {
      setLoading(true);
      const fetchSlots = async () => {
        try {
          const response = await fetch(
            `https://automate.crowncounseling.com/api/doctors/${selectedProvider}/slots`
          );
          const data = await response.json();
          setSlots(data);
        } catch (error) {
          console.error('Error fetching slots:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchSlots();
    }
  }, [selectedProvider]);

  // Handle date selection
  const handleDateSelect = (date) => {
    const filteredSlots = slots.filter(
      (slot) => new Date(slot.isoDate).toDateString() === date.toDateString()
    );

    if (filteredSlots.length === 0) {
      setErrorMessage('No available slots for this date. Please select another date.');
    } else {
      setErrorMessage('');
      setView('timeSlots'); // Switch to time slots view
    }

    setSelectedDate(date);
    setTimeSlots(filteredSlots);
  };

  // Handle time slot selection
  const handleTimeSlotSelect = (slot) => {
    const now = new Date();
    const slotDate = new Date(slot.isoDate);
    const timeDifference = slotDate - now;
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      setErrorMessage(
        'Appointments within 24 hours cannot be booked online. Please contact our office directly or select a slot further in advance.'
      );
    } else {
      setSelectedTimeSlot({
        ...slot,
        type: slot.location === 'Telehealth' ? 'Telephone' : 'In-person',
      });
      setShowAppointmentForm(true);
      setErrorMessage('');
    }
  };

  // Handle appointment cancellation
  const handleCancelAppointment = () => {
    setSelectedTimeSlot(null);
    setShowAppointmentForm(false);
    setErrorMessage('');
  };

  // Handle appointment submission
  const handleSubmitAppointment = (e, responseData = null) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (responseData) {
      console.log('Appointment submitted successfully:', responseData);
      setTimeout(() => {
        setSubmissionComplete(true);
      }, 1000);
    } else {
      console.warn('handleSubmitAppointment called without API response data');
      setTimeout(() => {
        setSubmissionComplete(true);
      }, 3000);
    }
  };

  // Add new function to go back to calendar
  const handleBackToCalendar = () => {
    setView('calendar');
    setSelectedDate(null);
    setTimeSlots([]);
    setErrorMessage('');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 360],
          }}
          transition={{
            duration: 1.5,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
          className="w-16 h-16 rounded-full"
          style={{ backgroundColor: primaryColor }}
        />
      </div>
    );
  } 

  return (
    <div className="min-h-screen ">
      <div className="w-full mx-auto px-2 sm:px-4 lg:px-6 pt-4 pb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="bg-white rounded-lg overflow-hidden w-full max-w-2xl mx-auto"
        >
          {isSubmitting && submissionComplete ? (
            <div className="p-8">
              <div className="flex flex-col items-center">
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
                    at {selectedTimeSlot?.time} with {selectedProviderName} has been submitted.
                  </p>
                  <p className="text-green-700 mt-4">
                    <strong>Please note:</strong> This is not a confirmed appointment. Our team will review your request 
                    and send you an email confirmation once it has been approved and scheduled.
                  </p>
                  <p className="text-green-600 mt-4 text-sm">
                    If you don't receive a confirmation within 24 hours, please contact our office directly.
                  </p>
                </div>
              </div>
            </div>
          ) : isSubmitting ? (
            <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
              <div
                className="w-16 h-16 border-4 border-t-4 border-gray-200 rounded-full mb-4 animate-spin"
                style={{ borderTopColor: primaryColor }}
              ></div>
              <p className="text-gray-600 text-center">Processing your appointment request...</p>
            </div>
          ) : (
            <div className="p-3 md:p-6">
              {!showAppointmentForm ? (
                <>
                  {!hideProviderDropdown && (
                    <>
                      <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
                        Choose which provider you'd like to see
                      </h2>

                      <div className="mb-4 md:mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Provider
                        </label>

                        <ProviderDropdown
                          doctors={doctors}
                          selectedProvider={selectedProvider}
                          setSelectedProvider={handleProviderChange}
                          selectedProviderName={selectedProviderName}
                          setSelectedProviderName={setSelectedProviderName}
                          primaryColor={primaryColor}
                        />
                      </div>
                    </>
                  )}

                  {selectedProvider && (
                    <motion.div
                      key={selectedProvider}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-4"
                    >
                      {view === 'calendar' ? (
                        <>
                          <div>
                            <h3 className="text-sm md:text-base font-medium"></h3>
                          </div>
                          <Calendar
                            currentWeekStart={currentWeekStart}
                            setCurrentWeekStart={setCurrentWeekStart}
                            selectedDate={selectedDate}
                            handleDateSelect={handleDateSelect}
                            primaryColor={primaryColor}
                            slots={slots}
                          />
                        </>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <div className="flex items-center mb-4">
                            <button
                              onClick={handleBackToCalendar}
                              className="flex items-center text-gray-600 hover:text-gray-800"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-1"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Back to Calendar
                            </button>
                          </div>

                          <h3 className="text-sm md:text-base font-medium mb-2">
                            Available times for {selectedDate?.toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h3>

                          {errorMessage && (
                            <div className="mb-3 p-2 bg-red-50 border-l-4 border-red-400 text-red-700 text-xs">
                              {errorMessage}
                            </div>
                          )}

                          {timeSlots.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 md:gap-2">
                              {timeSlots.map((slot, idx) => {
                                const now = new Date();
                                const slotDate = new Date(slot.isoDate);
                                const timeDifference = slotDate - now;
                                const hoursDifference = timeDifference / (1000 * 60 * 60);
                                const isWithin24Hours = hoursDifference < 24;

                                return (
                                  <motion.button
                                    key={idx}
                                    whileHover={{ scale: isWithin24Hours ? 1 : 1.03 }}
                                    whileTap={{ scale: isWithin24Hours ? 1 : 0.97 }}
                                    onClick={() => handleTimeSlotSelect(slot)}
                                    className={`py-1 px-1.5 md:px-2 border rounded text-xs md:text-sm relative ${
                                      isWithin24Hours
                                        ? 'border-orange-300 cursor-not-allowed'
                                        : 'border-gray-300 hover:border-transparent hover:text-white'
                                    }`}
                                    style={{
                                      backgroundColor: isWithin24Hours
                                        ? 'rgba(253, 230, 138, 0.2)'
                                        : 'white',
                                      color: isWithin24Hours ? '#B45309' : 'gray',
                                    }}
                                    onMouseOver={(e) => {
                                      if (!isWithin24Hours) {
                                        e.currentTarget.style.backgroundColor = primaryColor;
                                        e.currentTarget.style.color = 'white';
                                        const icon = e.currentTarget.querySelector('svg');
                                        if (icon) icon.style.color = 'white';
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      if (!isWithin24Hours) {
                                        e.currentTarget.style.backgroundColor = 'white';
                                        e.currentTarget.style.color = 'gray';
                                        const icon = e.currentTarget.querySelector('svg');
                                        if (icon) icon.style.color = primaryColor;
                                      }
                                    }}
                                  >
                                    <div className="flex items-center justify-center space-x-1">
                                      {slot.location === 'Telehealth' && (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-3 w-3 md:h-4 md:w-4 mr-1"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                          style={{ color: isWithin24Hours ? '#B45309' : primaryColor }}
                                        >
                                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                        </svg>
                                      )}
                                      <span>{slot.time}</span>
                                      <span className="text-[10px] opacity-75">(60m)</span>
                                    </div>

                                    {isWithin24Hours && (
                                      <div className="absolute -top-2 -right-2 bg-orange-100 text-orange-800 text-[8px] px-1 rounded-sm">
                                        Call only
                                      </div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500 py-3 text-sm">
                              All slots are booked for this date. Please select another date.
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </>
              ) : (
                <AppointmentForm
                  selectedProviderName={selectedProviderName}
                  selectedDate={selectedDate}
                  selectedTimeSlot={selectedTimeSlot}
                  handleCancelAppointment={handleCancelAppointment}
                  handleSubmitAppointment={handleSubmitAppointment}
                  isSubmitting={isSubmitting}
                  primaryColor={primaryColor}
                />
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default App;