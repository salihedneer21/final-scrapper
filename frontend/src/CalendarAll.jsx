import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CalendarAll = ({ currentWeekStart, setCurrentWeekStart, selectedDate, handleDateSelect, primaryColor, slots = [] }) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [autoAdvanceCount, setAutoAdvanceCount] = useState(0); // Track auto-advances to prevent infinite loops
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
  
  // Update the availableDates useMemo to correctly track slots by isoDate
  const availableDates = React.useMemo(() => {
    const dates = {};
    slots.forEach(slot => {
      if (slot.isoDate) {
        // Use isoDate as the key instead of dateString for consistent formatting
        const dateKey = slot.isoDate;
        
        if (!dates[dateKey]) {
          dates[dateKey] = [];
        }
        dates[dateKey].push(slot);
      }
    });
    return dates;
  }, [slots]);
  
  // Check if current week has any available slots
  const weekHasAvailableSlots = () => {
    const days = generateCalendarDays();
    return days.some(day => day.hasSlots);
  };

  // Auto-advance to next week if current week has no slots
  useEffect(() => {
    if (slots.length > 0 && !weekHasAvailableSlots() && autoAdvanceCount < 12) { // Limit to 12 weeks (3 months)
      const nextWeek = new Date(currentWeekStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentWeekStart(nextWeek);
      setAutoAdvanceCount(prev => prev + 1);
    }
  }, [currentWeekStart, slots, autoAdvanceCount, setCurrentWeekStart, weekHasAvailableSlots]);

  // Then update the generateCalendarDays function to use isoDate
  const generateCalendarDays = () => {
    const days = [];
    const weekStart = new Date(currentWeekStart);
    
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dayOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      date.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
      
      // Get formatted isoDate (YYYY-MM-DD) to match API format
      const isoDate = date.toISOString().split('T')[0];
      const isToday = today.getTime() === date.getTime();
      const isPastDate = date < today;
      const hasSlots = availableDates[isoDate] && availableDates[isoDate].length > 0;
      const slotCount = hasSlots ? availableDates[isoDate].length : 0;
      
      days.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday,
        isPastDate,
        hasSlots,
        slotCount
      });
    }
    return days;
  };

  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    
    // Prevent going to past weeks where all days are in the past
    const prevWeekEnd = new Date(prevWeek);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
    
    if (prevWeekEnd >= today) {
      setCurrentWeekStart(prevWeek);
      setErrorMessage('');
    }
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekStart(nextWeek);
    setErrorMessage('');
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(new Date());
    setErrorMessage('');
  };

  const handleDateClick = (day) => {
    // Clear any existing error message
    setErrorMessage('');
    
    // Only allow selecting current or future dates that have slots
    if (!day.isPastDate && day.hasSlots) {
      handleDateSelect(day.date);
    } else if (!day.isPastDate && !day.hasSlots) {
      // Show inline message for dates with no slots
      setErrorMessage("No appointments available for this date. Please select another date.");
    }
  };
  
  // Check if we're on the current week (to disable previous button when appropriate)
  const isCurrentWeek = () => {
    const currentWeek = new Date();
    currentWeek.setHours(0, 0, 0, 0);
    const currentDayOfWeek = currentWeek.getDay();
    currentWeek.setDate(currentWeek.getDate() - currentDayOfWeek); // Get Sunday of current week
    
    const viewWeek = new Date(currentWeekStart);
    viewWeek.setHours(0, 0, 0, 0);
    const viewDayOfWeek = viewWeek.getDay();
    viewWeek.setDate(viewWeek.getDate() - viewDayOfWeek); // Get Sunday of viewed week
    
    return currentWeek.getTime() === viewWeek.getTime();
  };

  return (
    <div className="pt-2">
      <div className="flex justify-center mb-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToCurrentWeek}
          className="px-3 py-1 text-xs md:text-sm bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none"
        >
          Today
        </motion.button>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileHover={!isCurrentWeek() ? { scale: 1.05 } : {}}
          whileTap={!isCurrentWeek() ? { scale: 0.95 } : {}}
          onClick={goToPreviousWeek}
          disabled={isCurrentWeek()}
          className={`p-2 rounded-full focus:outline-none ${
            isCurrentWeek() 
              ? 'bg-gray-50 cursor-not-allowed opacity-40' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          aria-label="Previous week"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </motion.button>
        
        <div className="text-sm text-center text-gray-500">
          {`${generateCalendarDays()[0].month} ${generateCalendarDays()[0].dayNumber} - ${generateCalendarDays()[6].month} ${generateCalendarDays()[6].dayNumber}`}
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToNextWeek}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none"
          aria-label="Next week"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </motion.button>
      </div>
      
      {/* Error message display */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}
      
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex space-x-2 md:space-x-4 min-w-max">
          {generateCalendarDays().map((day, idx) => (
            <motion.div
              key={idx}
              whileHover={(!day.isPastDate && day.hasSlots) ? { scale: 1.05 } : {}}
              whileTap={(!day.isPastDate && day.hasSlots) ? { scale: 0.95 } : {}}
              onClick={() => handleDateClick(day)}
              className={`rounded-lg p-2 md:p-4 text-center w-16 md:w-24 flex flex-col items-center justify-center relative ${
                selectedDate && selectedDate.toDateString() === day.date.toDateString()
                  ? 'text-white'
                  : day.isPastDate || !day.hasSlots
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
              } ${
                day.isToday && (!selectedDate || selectedDate.toDateString() !== day.date.toDateString()) 
                  ? 'border-2 border-' + primaryColor.replace('rgb', 'rgba').replace(')', ', 0.5)')
                  : ''
              }`}
              style={{
                backgroundColor: selectedDate && selectedDate.toDateString() === day.date.toDateString()
                  ? primaryColor
                  : 'transparent'
              }}
            >
              <p className="font-medium text-xs md:text-sm">{day.dayName}</p>
              <p className={`text-xl md:text-2xl font-bold ${day.isToday ? 'relative' : ''}`}>
                {day.dayNumber}
                {day.isToday && (!selectedDate || selectedDate.toDateString() !== day.date.toDateString()) && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-blue-500"></span>
                )}
              </p>
              <p className="text-xs md:text-sm">{day.month}</p>
              
              {/* Status indicator */}
              <p className={`text-[10px] md:text-xs mt-0.5 ${
                selectedDate && selectedDate.toDateString() === day.date.toDateString()
                  ? 'text-white text-opacity-90'
                  : 'text-gray-400'
              }`}>
                {day.isPastDate 
                  ? 'Past' 
                  : !day.hasSlots 
                    ? 'No slots' 
                    : `${day.slotCount} slot${day.slotCount !== 1 ? 's' : ''}`}
              </p>
              
              {/* Diagonal line through past dates or days with no slots */}
              {(day.isPastDate || !day.hasSlots) && (
                <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                  <div 
                    className="absolute top-0 left-0 w-[200%] h-[1px] bg-gray-300 origin-top-left rotate-45"
                    style={{ width: '200%', transformOrigin: 'top left', transform: 'rotate(45deg)' }}
                  ></div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarAll;