import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const ProviderDropdown = ({ doctors, selectedProvider, setSelectedProvider, selectedProviderName, setSelectedProviderName, primaryColor, clinicianName }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  const dropdownRef = useRef(null);

  const handleProviderSelect = (provider) => {
    if (typeof setSelectedProvider === 'function' && setSelectedProvider.length >= 2) {
      setSelectedProvider(provider.clinicianId, provider.cleanName);
    } else {
      setSelectedProvider(provider.clinicianId);
      setSelectedProviderName(provider.cleanName);
    }
    setDropdownOpen(false);
  };

  useEffect(() => {
    if (dropdownOpen && dropdownRef.current) {
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const bottomSpace = windowHeight - dropdownRect.bottom;
      
      if (bottomSpace < 200 && dropdownRect.top > 250) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [dropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hide dropdown if provider is selected via URL
  if (clinicianName && selectedProvider) {
    return (
      <div className="relative">
        <button 
          type="button"
          className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-3 text-left cursor-default focus:outline-none"
          style={{ 
            borderColor: primaryColor,
            boxShadow: `0 0 0 3px rgba(119, 168, 195, 0.2)`
          }}
        >
          <span className="block truncate">
            {selectedProviderName}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-3 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-opacity-75 transition-all duration-200"
        style={{ 
          borderColor: dropdownOpen ? primaryColor : '',
          boxShadow: dropdownOpen ? `0 0 0 3px rgba(119, 168, 195, 0.2)` : ''
        }}
      >
        <span className="block truncate">
          {selectedProviderName || "Select a provider"}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg 
            className={`h-5 w-5 transition-transform duration-200 ${dropdownOpen ? 'transform rotate-180' : ''}`} 
            style={{ color: primaryColor }} 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      
      <motion.div 
        initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -20 : 20 }}
        animate={{ 
          opacity: dropdownOpen ? 1 : 0,
          y: dropdownOpen ? 0 : (dropdownPosition === 'bottom' ? -20 : 20),
          pointerEvents: dropdownOpen ? "auto" : "none",
          transition: { duration: 0.2 }
        }}
        className={`fixed ${dropdownPosition === 'bottom' ? 'top-auto' : 'bottom-auto'} left-auto z-50 rounded-md bg-white max-h-60 overflow-auto focus:outline-none`}
        style={{ 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          borderRadius: '0.5rem',
          width: dropdownRef.current ? Math.min(dropdownRef.current.offsetWidth, window.innerWidth - 40) : 'auto',
          maxWidth: 'calc(100vw - 32px)',
          marginTop: dropdownPosition === 'bottom' ? '5px' : '',
          marginBottom: dropdownPosition === 'top' ? '5px' : '',
          transform: `translate(${dropdownRef.current ? 
            Math.min(dropdownRef.current.getBoundingClientRect().left, window.innerWidth - (dropdownRef.current.offsetWidth + 20)) : 0}px, ${
            dropdownPosition === 'bottom' 
              ? (dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + window.scrollY : 0)
              : (dropdownRef.current ? dropdownRef.current.getBoundingClientRect().top + window.scrollY - 5 : 0) - (dropdownOpen && dropdownRef.current?.querySelector('ul')?.offsetHeight || 0)
          }px)`
        }}
      >
        <ul className="py-1 w-full">
          {doctors.map((doctor) => (
            <li 
              key={doctor._id} 
              onClick={() => handleProviderSelect(doctor)}
              className={`cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-gray-50 transition-colors duration-150 ${
                selectedProvider === doctor.clinicianId ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryColor }}>
                  {doctor.cleanName.charAt(0)}
                </div>
                <span className={`ml-3 block font-medium truncate ${
                  selectedProvider === doctor.clinicianId ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {doctor.cleanName}
                </span>
              </div>
              
              {selectedProvider === doctor.clinicianId && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4" style={{ color: primaryColor }}>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
};

export default ProviderDropdown;