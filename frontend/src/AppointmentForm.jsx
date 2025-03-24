import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { submitAppointmentForm } from './services/api';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const insuranceOptions = [
  { name: 'Any Insurance Provider', averageCopay: '', zeroCopayPercentage: '' },
  { name: 'Fidelis', averageCopay: '$18', zeroCopayPercentage: '40%' },
  { name: 'Healthfirst', averageCopay: '$21', zeroCopayPercentage: '35%' },
  { name: 'Anthem', averageCopay: '$27', zeroCopayPercentage: '25%' },
  { name: 'MetroPlus', averageCopay: '$15', zeroCopayPercentage: '30%' },
  { name: 'Blue Cross Blue Shield', averageCopay: '$32', zeroCopayPercentage: '15%' },
  { name: 'Oxford', averageCopay: '$23', zeroCopayPercentage: '0%' },
  { name: 'Aetna', averageCopay: '$35', zeroCopayPercentage: '10%' },
  { name: 'Cigna', averageCopay: '$38', zeroCopayPercentage: '45%' },
  { name: 'Private pay', averageCopay: 'N/A', zeroCopayPercentage: 'N/A' },
  { name: 'Other', averageCopay: 'N/A', zeroCopayPercentage: 'N/A' }
];

const formatDateOfBirth = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

const AppointmentForm = ({
  selectedProviderName,
  selectedDate,
  selectedTimeSlot,
  handleCancelAppointment,
  handleSubmitAppointment,
  isSubmitting,
  primaryColor = '#4f46e5'
}) => {
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [insurance, setInsurance] = useState('');
  const [memberId, setMemberId] = useState('');
  const [previousTherapy, setPreviousTherapy] = useState('');
  const [takingMedication, setTakingMedication] = useState('');
  const [mentalDiagnosis, setMentalDiagnosis] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [frontCardFile, setFrontCardFile] = useState(null);
  const [backCardFile, setBackCardFile] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showingInsuranceInfo, setShowingInsuranceInfo] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  // First, add these new state variables at the beginning of your component:
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Add this with your other state variables
  const [medicationHistory, setMedicationHistory] = useState('');
  const [hasMedicationHistory, setHasMedicationHistory] = useState('');

  // Add this useEffect after your other state declarations
  useEffect(() => {
    if (dateOfBirth) {
      const date = new Date(dateOfBirth);
      if (!isNaN(date.getTime())) {
        setDobMonth((date.getMonth() + 1).toString().padStart(2, '0'));
        setDobDay(date.getDate().toString().padStart(2, '0'));
        setDobYear(date.getFullYear().toString());
      }
    }
  }, [dateOfBirth]);

  // Updated steps for 10-step form
  const steps = [
    { 
      label: 'Personal Information', 
      fields: ['firstName', 'lastName', 'dateOfBirth', 'email', 'phone'] 
    },
    { 
      label: 'Insurance Information', 
      fields: ['insurance', 'memberId', 'frontCardFile', 'backCardFile'] 
    },
    { 
      label: 'Medical History', 
      fields: ['previousTherapy', 'takingMedication', 'mentalDiagnosis', 'medicationHistory', 'reason'] 
    }
  ];

  // Add this new function to validate current step
  const validateCurrentStep = () => {
    const errors = {};
    const currentFields = steps[currentStep].fields;

    if (currentFields.includes('firstName') && !firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (currentFields.includes('lastName') && !lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (currentFields.includes('dateOfBirth') && !dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    }
    if (currentFields.includes('email') && !email.trim()) {
      errors.email = "Email is required";
    } else if (currentFields.includes('email') && email.trim() && !/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email address is invalid";
    }
    if (currentFields.includes('phone') && !phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (currentFields.includes('phone') && phone.trim() && !isValidPhoneNumber(phone)) {
      errors.phone = "Please enter a valid US phone number";
    }
    if (currentFields.includes('previousTherapy') && !previousTherapy) {
      errors.previousTherapy = "Previous therapy information is required";
    }
    if (currentFields.includes('takingMedication') && !takingMedication) {
      errors.takingMedication = "Medication information is required";
    }
    if (currentFields.includes('reason') && !reason.trim()) {
      errors.reason = "Reason for therapy is required";
    }

    // Add to your validateCurrentStep function for date validation
    if (currentFields.includes('dateOfBirth')) {
      if (!dobMonth || !dobDay || !dobYear) {
        errors.dateOfBirth = "Date of birth is required";
      } else {
        try {
          const month = parseInt(dobMonth);
          const day = parseInt(dobDay);
          const year = parseInt(dobYear);
          
          // Validate month (1-12)
          if (month < 1 || month > 12) {
            errors.dateOfBirth = "Month must be between 1 and 12";
          } 
          // Validate day based on month
          else {
            const daysInMonth = new Date(year, month, 0).getDate();
            if (day < 1 || day > daysInMonth) {
              errors.dateOfBirth = `Invalid day for selected month (must be 1-${daysInMonth})`;
            } 
            // Validate year is reasonable
            else if (year < 1900 || year > new Date().getFullYear()) {
              errors.dateOfBirth = "Please enter a valid year";
            }
            // If all individual validations pass, construct and set the date
            else {
              // If we reach here, we have valid date components - update dateOfBirth directly
              const formattedMonth = month.toString().padStart(2, '0');
              const formattedDay = day.toString().padStart(2, '0');
              const newDate = new Date(`${formattedMonth}/${formattedDay}/${year}`);
              
              if (isNaN(newDate.getTime()) || newDate > new Date()) {
                errors.dateOfBirth = "Please enter a valid date of birth";
              } else {
                // Set the date synchronously for validation purposes
                setDateOfBirth(newDate);
              }
            }
          }
        } catch (error) {
          errors.dateOfBirth = "Please enter a valid date of birth";
          console.error("Error validating date:", error);
        }
      }
    }

    if (currentFields.includes('medicationHistory') && !hasMedicationHistory) {
      errors.hasMedicationHistory = "Please select Yes or No";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    // For debugging
    console.log('Next clicked', { currentStep, showingInsuranceInfo });
    
    // Special handling for insurance info screen
    if (showingInsuranceInfo) {
      setShowingInsuranceInfo(false);
      setCurrentStep(3);
      return;
    }
    
    // If we're on the DOB step, validate and set the date directly rather than relying on state
    if (currentStep === 1 && dobMonth && dobDay && dobYear) {
      try {
        const month = parseInt(dobMonth);
        const day = parseInt(dobDay);
        const year = parseInt(dobYear);
        
        if (month < 1 || month > 12) {
          setFormErrors({dateOfBirth: "Month must be between 1 and 12"});
          return;
        }
        
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
          setFormErrors({dateOfBirth: `Invalid day for selected month (must be 1-${daysInMonth})`});
          return;
        }
        
        if (year < 1900 || year > new Date().getFullYear()) {
          setFormErrors({dateOfBirth: "Please enter a valid year"});
          return;
        }
        
        const formattedMonth = month.toString().padStart(2, '0');
        const formattedDay = day.toString().padStart(2, '0');
        const newDate = new Date(`${formattedMonth}/${formattedDay}/${year}`);
        
        if (isNaN(newDate.getTime()) || newDate > new Date()) {
          setFormErrors({dateOfBirth: "Please enter a valid date of birth"});
          return;
        }
        
        // Set the date immediately
        setDateOfBirth(newDate);
        
        // Move to next step directly since we've already validated
        setCurrentStep(currentStep + 1);
        return;
      } catch (error) {
        console.error("Error validating date:", error);
        setFormErrors({dateOfBirth: "Please enter a valid date of birth"});
        return;
      }
    }
    
    // For other steps, use regular validation
    if (!validateCurrentStep()) {
      return;
    }
    
    // Standard step progression
    if (currentStep === 2) {
      // After completing Contact info, show insurance info screen
      setShowingInsuranceInfo(true);
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (showingInsuranceInfo) {
      setShowingInsuranceInfo(false);
      return;
    }
    
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderField = (field) => {
    switch (field) {
      case 'firstName':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              First Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.firstName ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
              }`}
            />
            {formErrors.firstName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-0.5 text-xs text-red-600"
              >
                {formErrors.firstName}
              </motion.p>
            )}
          </div>
        );
      case 'middleName':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              Middle Name
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-opacity-50"
            />
          </div>
        );
      case 'lastName':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              Last Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.lastName ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
              }`}
            />
            {formErrors.lastName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-0.5 text-xs text-red-600"
              >
                {formErrors.lastName}
              </motion.p>
            )}
          </div>
        );
      case 'dateOfBirth':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              Date of Birth
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex space-x-2">
              {/* Month input */}
              <div className="w-1/4">
                <input
                  type="text"
                  value={dobMonth}
                  onChange={(e) => {
                    // Allow free typing for numbers
                    const value = e.target.value.replace(/\D/g, '');
                    setDobMonth(value);
                  }}
                  onBlur={() => {
                    // Only format on blur
                    if (dobMonth && parseInt(dobMonth) > 0 && parseInt(dobMonth) <= 12) {
                      // Pad with leading zero if needed
                      setDobMonth(parseInt(dobMonth).toString().padStart(2, '0'));
                    }
                  }}
                  placeholder="MM"
                  maxLength={2}
                  className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors text-center ${
                    formErrors.dateOfBirth ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
                  }`}
                />
              </div>
              
              {/* Day input */}
              <div className="w-1/4">
                <input
                  type="text"
                  value={dobDay}
                  onChange={(e) => {
                    // Allow free typing for numbers
                    const value = e.target.value.replace(/\D/g, '');
                    setDobDay(value);
                  }}
                  onBlur={() => {
                    // Only format on blur
                    if (dobDay && parseInt(dobDay) > 0 && parseInt(dobDay) <= 31) {
                      // Pad with leading zero if needed
                      setDobDay(parseInt(dobDay).toString().padStart(2, '0'));
                    }
                  }}
                  placeholder="DD"
                  maxLength={2}
                  className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors text-center ${
                    formErrors.dateOfBirth ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
                  }`}
                />
              </div>
              
              {/* Year input */}
              <div className="w-2/4">
                <input
                  type="text"
                  value={dobYear}
                  onChange={(e) => {
                    // Allow free typing for numbers
                    const value = e.target.value.replace(/\D/g, '');
                    setDobYear(value);
                  }}
                  placeholder="YYYY"
                  maxLength={4}
                  className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors text-center ${
                    formErrors.dateOfBirth ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
                  }`}
                />
              </div>
            </div>
            {formErrors.dateOfBirth && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-0.5 text-xs text-red-600"
              >
                {formErrors.dateOfBirth}
              </motion.p>
            )}
          </div>
        );
      case 'email':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              Email Address
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.email ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
              }`}
            />
            {formErrors.email && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-0.5 text-xs text-red-600"
              >
                {formErrors.email}
              </motion.p>
            )}
          </div>
        );
      case 'phone':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              Phone Number
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.phone ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
              }`}
            />
            {formErrors.phone && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-0.5 text-xs text-red-600"
              >
                {formErrors.phone}
              </motion.p>
            )}
          </div>
        );
      case 'insurance':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              Insurance Provider
            </label>
            <select
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              className="w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-opacity-50"
            >
              {insuranceOptions.map((option, index) => (
                <option key={index} value={option.name}>{option.name}</option>
              ))}
            </select>
            {insurance && insurance !== 'Any Insurance Provider' && (
              <div className="mt-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5">

                  <div className="flex justify-between mb-4">
                    <div>
                      <div className="text-gray-700 text-base">
                        Average Copay: <span className="font-medium">{insuranceOptions.find(ins => ins.name === insurance)?.averageCopay || '0'}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-700 text-base">
                        Percentage with $0 Copay: <span className="font-medium">{insuranceOptions.find(ins => ins.name === insurance)?.zeroCopayPercentage || '0%'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm">
                    personalized estimate, verify insurance when you book a session.
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'memberId':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              Insurance Member ID
            </label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-opacity-50"
              placeholder="Enter your member ID (optional)"
            />
          </div>
        );
      case 'frontCardFile':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              Insurance Card - Front Side
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-xs text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'front')}
                />
              </label>
            </div>
            {frontCardFile && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <span>{frontCardFile.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('front')}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case 'backCardFile':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              Insurance Card - Back Side
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-xs text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'back')}
                />
              </label>
            </div>
            {backCardFile && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <span>{backCardFile.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('back')}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case 'previousTherapy':
        return (
          <div>
<label className="block text-md font-medium text-gray-700 mb-0.5">
Have you been to therapy before?
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={previousTherapy}
              onChange={(e) => setPreviousTherapy(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.previousTherapy ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
              }`}
            >
              <option value="">Please select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {formErrors.previousTherapy && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-0.5 text-xs text-red-600"
              >
                {formErrors.previousTherapy}
              </motion.p>
            )}
          </div>
        );
      case 'takingMedication':
        return (
          <div>
            
            <label className="block text-md font-medium text-gray-700 mb-0.5">
            Do you have an existing mental health diagnosis?

              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={takingMedication}
              onChange={(e) => setTakingMedication(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.takingMedication ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
              }`}
            >
              <option value="">Please select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {formErrors.takingMedication && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-0.5 text-xs text-red-600"
              >
                {formErrors.takingMedication}
              </motion.p>
            )}
          </div>
        );
      case 'mentalDiagnosis':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
            If yes, what?
            </label>
            <textarea
              rows={2}
              value={mentalDiagnosis}
              onChange={(e) => setMentalDiagnosis(e.target.value)}
              className="w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-opacity-50"
              placeholder="Medication (Optional)"
            />
          </div>
        );
      case 'medicationHistory':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-md font-medium text-gray-700 mb-0.5">
                Do you have a history of taking psychotropic medication or psychiatric hospitalization?
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={hasMedicationHistory}
                onChange={(e) => setHasMedicationHistory(e.target.value)}
                className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors ${
                  formErrors.hasMedicationHistory ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
                }`}
              >
                <option value="">Please select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {formErrors.hasMedicationHistory && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-0.5 text-xs text-red-600"
                >
                  {formErrors.hasMedicationHistory}
                </motion.p>
              )}
            </div>
              <div>
                <label className="block text-md font-medium text-gray-700 mb-0.5">
                  If yes please tell us more
                </label>
                <textarea
                  value={medicationHistory}
                  onChange={(e) => setMedicationHistory(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-opacity-50"
                  placeholder="Please provide details about your medication history or hospitalizations"
                />
              </div>
          </div>
        );
      case 'reason':
        return (
          <div>
            <label className="block text-md font-medium text-gray-700 mb-0.5">
              What brings you to therapy?
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setMessage(e.target.value);
              }}
              rows={2}
              className={`w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.reason ? 'border-red-300' : 'border-gray-300 focus:ring-1 focus:ring-opacity-50'
              }`}
            />
            {formErrors.reason && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-0.5 text-xs text-red-600"
              >
                {formErrors.reason}
              </motion.p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const handleFileChange = (e, side) => {
    const file = e.target.files[0];
    if (side === 'front') {
      setFrontCardFile(file);
    } else if (side === 'back') {
      setBackCardFile(file);
    }
    e.target.value = '';
  };

  const handleRemoveFile = (side) => {
    if (side === 'front') {
      setFrontCardFile(null);
    } else if (side === 'back') {
      setBackCardFile(null);
    }
  };

  const isValidPhoneNumber = (phone) => {
    const phoneRegex = /^\(\d{3}\)\s\d{3}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const formatPhoneNumber = (value) => {
    const cleaned = ('' + value).replace(/\D/g, '');
    if (cleaned.length <= 10) {
      const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (match) {
        return !match[2] ? match[1] : 
               !match[3] ? `(${match[1]}) ${match[2]}` :
               `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    }
    return value.slice(0, 14); // Limit total length including formatting
  };

  const validateForm = () => {
    const errors = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Email address is invalid";
    if (!phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!isValidPhoneNumber(phone)) {
      errors.phone = "Please enter a valid US phone number";
    }
    if (!dateOfBirth) errors.dateOfBirth = "Date of birth is required";
    if (!previousTherapy) errors.previousTherapy = "Previous therapy information is required";
    if (!takingMedication) errors.takingMedication = "Medication information is required";
    if (!reason.trim()) errors.reason = "Reason for therapy is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const debouncedValidateForm = useCallback(
    debounce(() => validateForm(), 300),
    [firstName, lastName, email, phone, dateOfBirth, insurance, memberId, previousTherapy, 
     takingMedication, mentalDiagnosis, reason]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (localSubmitting || isSubmitting) return;
    
    if (validateForm()) {
      try {
        setLocalSubmitting(true);
        
        const formFields = {
          'first-name': firstName,
          'middle-name': middleName,
          'last-name': lastName,
          'preferred-name': preferredName,
          'email': email,
          'mobile': formatPhoneNumber(phone),
          'dob': formatDateOfBirth(dateOfBirth),
          'insurance': insurance,
          'member-id': memberId,
          'previous-therapy': previousTherapy,
          'taking-medication': takingMedication,
          'mental-diagnosis': mentalDiagnosis,
          'has-medication-history': hasMedicationHistory,
          'medication-history': medicationHistory,
          'reason': reason,
          'message': reason,
          'selectedProviderName': selectedProviderName,
          'selectedDate': selectedDate?.toISOString().split('T')[0],
          'selectedTimeSlot': selectedTimeSlot
        };

        const formData = new FormData();
        formData.append('formData', JSON.stringify(formFields));

        if (frontCardFile) {
          formData.append('files', frontCardFile);
        }
        if (backCardFile) {
          formData.append('files', backCardFile);
        }

        const href = selectedTimeSlot?.href;
        if (!href) {
          throw new Error('Missing appointment request URL');
        }

        const response = await submitAppointmentForm(formData, href);
        
        if (response.success) {
          // Call fetch-appointments API after successful form submission
          try {
            await fetch('https://automate.crowncounseling.com/api/fetch-appointments');
          } catch (fetchError) {
            console.error('Error calling fetch-appointments:', fetchError);
            // Continue with form submission even if this call fails
          }

          await handleSubmitAppointment(e, {
            ...response,
            fileUrls: response.fileUrls || []
          });
          setIsSubmitSuccess(true);
        } else {
          throw new Error(response.message || 'Form submission failed');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        setFormErrors(prev => ({
          ...prev,
          submit: error.message
        }));
      } finally {
        setLocalSubmitting(false);
      }
    }
  };

  const handleInsuranceInfoNext = () => {
    setShowingInsuranceInfo(false);
    setCurrentStep(3); // Move to Insurance Provider step
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg p-3 max-w-full mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-2">
          {/* Simplified step indicator */}
          {/* <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">
              {!showingInsuranceInfo && `Step ${currentStep + 1}/${steps.length}`}
            </span>
            <span className="text-xs font-medium" style={{ color: primaryColor }}>
              {!showingInsuranceInfo && steps[currentStep].label}
            </span>
          </div> */}
          
          {/* Progress bar - only show when not on insurance info screen */}
          {!showingInsuranceInfo && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                  backgroundColor: primaryColor
                }}
              ></div>
            </div>
          )}
        </div>

        {showingInsuranceInfo ? (
          <div 
            className="p-4 rounded-lg"
            style={{ 
              backgroundColor: `${primaryColor}10`,
              border: `1px solid ${primaryColor}30`
            }}
          >
            <div className="flex items-start mb-3">
              <svg 
                className="w-5 h-5 mt-0.5 mr-2" 
                fill="currentColor" 
                viewBox="0 0 20 20" 
                style={{ color: primaryColor }}
              >
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 
                className="text-sm font-medium" 
                style={{ color: primaryColor }}
              >
                Insurance Information
              </h3>
            </div>
            <p 
              className="text-sm mb-1" 
              style={{ color: `${primaryColor}DD` }}
            >
             You can add insurance information later, but it will be required before finalizing the appointment.
            </p>
            <div className="mt-4">
              
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-3 rounded-lg">
            {steps[currentStep].fields.map((field, index) => (
              <div key={index} className="mb-3">
                {renderField(field)}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Show back button on all steps */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={currentStep === 0 ? () => window.location.reload() : handleBack}
            className="px-3 py-1.5 text-gray-700 bg-gray-200 rounded-md focus:outline-none transition-colors font-medium text-xs flex items-center justify-center flex-1 mr-2"
          >
            Back
          </motion.button>

          {(currentStep < steps.length - 1 || showingInsuranceInfo) ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleNext}
              className="px-3 py-1.5 text-white rounded-md focus:outline-none transition-colors font-medium text-xs flex items-center justify-center flex-1"
              style={{ backgroundColor: primaryColor }}
            >
              Next
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting || localSubmitting}
              className="px-3 py-1.5 text-white rounded-md focus:outline-none transition-colors font-medium text-xs flex items-center justify-center flex-1"
              style={{ backgroundColor: primaryColor }}
            >
              {(isSubmitting || localSubmitting) ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </motion.button>
          )}
        </div>

        <div className="text-center text-xxs text-gray-500 pt-1">
          Fields marked with <span className="text-red-500">*</span> are required
        </div>
      </form>
      {isSubmitSuccess && (
        <SuccessMessage 
          date={selectedDate?.toLocaleDateString()} 
          time={selectedTimeSlot?.time} 
          provider={selectedProviderName} 
        />
      )}
    </motion.div>
  );
};

AppointmentForm.propTypes = {
  selectedProviderName: PropTypes.string.isRequired,
  selectedDate: PropTypes.instanceOf(Date),
  selectedTimeSlot: PropTypes.shape({
    time: PropTypes.string,
    type: PropTypes.string,
    href: PropTypes.string
  }),
  handleCancelAppointment: PropTypes.func.isRequired,
  handleSubmitAppointment: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  primaryColor: PropTypes.string
};

const SuccessMessage = ({ date, time, provider }) => (
  <div className="bg-green-50 border border-green-100 rounded-md p-3 text-center">
    <div className="flex items-center justify-center mb-1">
      <h3 className="text-sm font-medium text-green-900">Appointment Request Submitted</h3>
    </div>
    <p className="text-xs text-green-600 mb-1">
      Your request for an appointment on {date} at {time} with {provider} has been submitted.
    </p>
    <p className="text-xs text-gray-500 italic">
      This is not a confirmed appointment. Our team will review your request and send you an email confirmation.
    </p>
    <p className="text-xs text-gray-500 mt-1">
      If no confirmation is received within 24 hours, please contact our office directly.
    </p>
  </div>
);

class AppointmentFormErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please try again later.</div>;
    }
    return this.props.children;
  }
}

export default function AppointmentFormWithErrorBoundary(props) {
  return (
    <AppointmentFormErrorBoundary>
      <AppointmentForm {...props} />
    </AppointmentFormErrorBoundary>
  );
}