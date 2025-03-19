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

  // Updated steps for 9-step form
  const steps = [
    { label: 'Name', fields: ['firstName', 'lastName'] },
    { label: 'Date of Birth', fields: ['dateOfBirth'] },
    { label: 'Contact', fields: ['email', 'phone'] },
    { label: 'Insurance Provider', fields: ['insurance'] },
    { label: 'Member ID', fields: ['memberId'] },
    { label: 'Insurance Front', fields: ['frontCardFile'] },
    { label: 'Insurance Back', fields: ['backCardFile'] },
    { label: 'Medical History', fields: ['previousTherapy', 'takingMedication', 'mentalDiagnosis'] },
    { label: 'Reason', fields: ['reason'] }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderField = (field) => {
    switch (field) {
      case 'firstName':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.firstName ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
              }`}
            />
            {formErrors.firstName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-sm text-red-600"
              >
                {formErrors.firstName}
              </motion.p>
            )}
          </div>
        );
      case 'middleName':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Middle Name
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors border-gray-300 focus:ring-2 focus:ring-opacity-50"
            />
          </div>
        );
      case 'lastName':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.lastName ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
              }`}
            />
            {formErrors.lastName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-sm text-red-600"
              >
                {formErrors.lastName}
              </motion.p>
            )}
          </div>
        );
      case 'dateOfBirth':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
              <span className="text-red-500 ml-1">*</span>
            </label>
            <DatePicker
              selected={dateOfBirth ? new Date(dateOfBirth) : null}
              onChange={(date) => setDateOfBirth(date)}
              dateFormat="MM/dd/yyyy"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              maxDate={new Date()}
              minDate={new Date(1900, 0, 1)}
              yearDropdownItemNumber={100}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.dateOfBirth ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
              }`}
              placeholderText="MM/DD/YYYY"
            />
            {formErrors.dateOfBirth && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-sm text-red-600"
              >
                {formErrors.dateOfBirth}
              </motion.p>
            )}
          </div>
        );
      case 'email':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.email ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
              }`}
            />
            {formErrors.email && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-sm text-red-600"
              >
                {formErrors.email}
              </motion.p>
            )}
          </div>
        );
      case 'phone':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.phone ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
              }`}
            />
            {formErrors.phone && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-sm text-red-600"
              >
                {formErrors.phone}
              </motion.p>
            )}
          </div>
        );
      case 'insurance':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Provider
            </label>
            <select
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors border-gray-300 focus:ring-2 focus:ring-opacity-50"
            >
              {insuranceOptions.map((option, index) => (
                <option key={index} value={option.name}>{option.name}</option>
              ))}
            </select>
            {insurance && insurance !== 'Any Insurance Provider' && (
              <div className="mt-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5">
                  <div className="text-emerald-800 text-lg font-medium mb-3">
                    Insurance Details
                  </div>
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
                    For a personalized estimate, verify your insurance when you book a session.
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'memberId':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Member ID
            </label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors border-gray-300 focus:ring-2 focus:ring-opacity-50"
              placeholder="Enter your member ID (optional)"
            />
          </div>
        );
      case 'frontCardFile':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Card - Front Side
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">Upload the front of your insurance card (optional)</p>
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
                <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Card - Back Side
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">Upload the back of your insurance card (optional)</p>
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
                <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Previous Therapy?
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={previousTherapy}
              onChange={(e) => setPreviousTherapy(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.previousTherapy ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
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
                className="mt-1 text-sm text-red-600"
              >
                {formErrors.previousTherapy}
              </motion.p>
            )}
          </div>
        );
      case 'takingMedication':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taking Medication?
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={takingMedication}
              onChange={(e) => setTakingMedication(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.takingMedication ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
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
                className="mt-1 text-sm text-red-600"
              >
                {formErrors.takingMedication}
              </motion.p>
            )}
          </div>
        );
      case 'mentalDiagnosis':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              If yes, what are they
            </label>
            <input
              type="text"
              value={mentalDiagnosis}
              onChange={(e) => setMentalDiagnosis(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors border-gray-300 focus:ring-2 focus:ring-opacity-50"
              placeholder="Medication (Optional)"
            />
          </div>
        );
      case 'reason':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What brings you to therapy?
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setMessage(e.target.value);
              }}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                formErrors.reason ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
              }`}
            />
            {formErrors.reason && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-sm text-red-600"
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
          await handleSubmitAppointment(e, {
            ...response,
            fileUrls: response.fileUrls || []
          });
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-lg p-4 sm:p-8 max-w-4xl mx-auto"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 sm:mb-8 text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: primaryColor }}>Complete Your Appointment Request</h2>
        <div className="bg-gray-100 inline-block px-3 py-1 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base text-gray-700">
          <span className="font-medium">{selectedProviderName}</span> • {' '}
          <span>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span> • {' '}
          <span>{selectedTimeSlot?.time}</span> • {' '}
          <span>{selectedTimeSlot?.type === 'Telephone' ? 'Telephone' : 'In-person'}</span>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <div className="mb-4 sm:mb-6">
          {/* Simplified step indicator for all screen sizes */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm sm:text-base font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm sm:text-base font-medium" style={{ color: primaryColor }}>
              {steps[currentStep].label}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="h-2.5 rounded-full transition-all duration-300"
              style={{ 
                width: `${((currentStep + 1) / steps.length) * 100}%`,
                backgroundColor: primaryColor
              }}
            ></div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
          {steps[currentStep].fields.map((field, index) => (
            <div key={index} className="mb-5">
              {renderField(field)}
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4 sm:pt-6 gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none font-medium text-sm sm:text-base flex-1 sm:flex-none"
          >
            Back
          </motion.button>

          {currentStep < steps.length - 1 ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleNext}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-white rounded-md focus:outline-none transition-colors font-medium text-sm sm:text-base flex items-center justify-center flex-1 sm:flex-none"
              style={{ backgroundColor: primaryColor }}
            >
              Next
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting || localSubmitting}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-white rounded-md focus:outline-none transition-colors font-medium text-sm sm:text-base flex items-center justify-center flex-1 sm:flex-none"
              style={{ backgroundColor: primaryColor }}
            >
              {(isSubmitting || localSubmitting) ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

        <div className="text-center text-xs sm:text-sm text-gray-500 pt-2 sm:pt-4">
          Fields marked with <span className="text-red-500">*</span> are required
        </div>
      </form>
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