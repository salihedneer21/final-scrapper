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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [frontCardFile, setFrontCardFile] = useState(null);
  const [backCardFile, setBackCardFile] = useState(null);

  useEffect(() => {
    return () => {
      // Cleanup uploaded files when component unmounts
      setSelectedFiles([]);
      setUploadProgress({});
    };
  }, []);

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

  const formatDateOfBirth = (value) => {
    const cleaned = ('' + value).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (match) {
      return `${match[1]}/${match[2]}/${match[3]}`;
    }
    return value;
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
          // message will be stored in MongoDB but not in spreadsheet
          'message': reason, // Use the same text as reason
          'selectedProviderName': selectedProviderName,
          'selectedDate': selectedDate?.toISOString().split('T')[0],
          'selectedTimeSlot': selectedTimeSlot
        };

        // Create FormData for file upload
        const formData = new FormData();
        
        // Append the form fields as a JSON string
        formData.append('formData', JSON.stringify(formFields));

        // Add both files together under the 'files' field
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

        // Submit form with files
        const response = await submitAppointmentForm(formData, href);
        
        if (response.success) {
          // Add fileUrls to the response data
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

  const handleInsuranceChange = (value) => {
    setInsurance(value);
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

  const selectedInsurance = insuranceOptions.find(ins => ins.name === insurance);

  const formSections = [
    {
      title: "Personal Information",
      fields: [
        {
          label: "First Name",
          required: true,
          value: firstName,
          onChange: setFirstName,
          type: "text",
          error: formErrors.firstName,
          colSpan: 1
        },
        {
          label: "Middle Name",
          required: false,
          value: middleName,
          onChange: setMiddleName,
          type: "text",
          colSpan: 1
        },
        {
          label: "Last Name",
          required: true,
          value: lastName,
          onChange: setLastName,
          type: "text",
          error: formErrors.lastName,
          colSpan: 1
        },
        {
          label: "Date of Birth",
          required: true,
          value: dateOfBirth,
          onChange: (date) => setDateOfBirth(date),
          type: "datepicker",
          error: formErrors.dateOfBirth,
          colSpan: 1,
          maxDate: new Date(),
          minDate: new Date(1900, 0, 1),
          yearRange: 100,
        }
      ]
    },
    {
      title: "Contact Details",
      fields: [
        {
          label: "Email Address",
          required: true,
          value: email,
          onChange: setEmail,
          type: "email",
          error: formErrors.email,
          colSpan: 1
        },
        {
          label: "Phone Number",
          required: true,
          value: phone,
          onChange: (value) => setPhone(formatPhoneNumber(value)),
          type: "tel",
          error: formErrors.phone,
          colSpan: 1
        }
      ]
    },
    {
      title: "Medical Information",
      fields: [
        {
          label: "Insurance Provider",
          required: false, // Changed to false
          value: insurance,
          onChange: handleInsuranceChange,
          type: "select",
          options: insuranceOptions.map(ins => ({ 
            value: ins.name, 
            label: ins.name
          })),
          error: formErrors.insurance,
          colSpan: 2,
          customContent: insurance && insurance !== 'Any Insurance Provider' && (
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
          )
        },
        {
          label: "Insurance Member ID",
          required: false,
          value: memberId,
          onChange: setMemberId,
          type: "text",
          error: formErrors.memberId,
          colSpan: 2, // Full width for member ID
          placeholder: "Enter your member ID (optional)"
        },
        {
          label: "Insurance Card - Front Side",
          description: "Upload the front of your insurance card (optional)",
          required: false,
          type: "file",
          accept: ".pdf,.jpg,.jpeg,.png",
          multiple: false,
          onChange: (e) => handleFileChange(e, 'front'),
          value: frontCardFile,
          side: 'front',
          error: formErrors.frontFile,
          colSpan: 1
        },
        {
          label: "Insurance Card - Back Side",
          description: "Upload the back of your insurance card (optional)",
          required: false,
          type: "file",
          accept: ".pdf,.jpg,.jpeg,.png",
          multiple: false,
          onChange: (e) => handleFileChange(e, 'back'),
          value: backCardFile,
          side: 'back',
          error: formErrors.backFile,
          colSpan: 1
        },
        {
          label: "Previous Therapy?",
          required: true,
          value: previousTherapy,
          onChange: setPreviousTherapy,
          type: "select",
          options: [
            { value: "", label: "Please select" },
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" }
          ],
          error: formErrors.previousTherapy,
          colSpan: 1 // Half width
        },
        {
          label: "Taking Medication?",
          required: true,
          value: takingMedication,
          onChange: setTakingMedication,
          type: "select",
          options: [
            { value: "", label: "Please select" },
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" }
          ],
          error: formErrors.takingMedication,
          colSpan: 1 // Half width
        },
        {
          label: "If yes, what are they",
          required: false,
          value: mentalDiagnosis,
          onChange: setMentalDiagnosis,
          type: "text",
          error: formErrors.mentalDiagnosis,
          colSpan: 2, // Full width for medication list
          placeholder: "Medication (Optional)"
        },
        {
          label: "What brings you to therapy?",
          required: true,
          value: reason,
          onChange: (value) => {
            setReason(value);
            setMessage(value);
          },
          type: "textarea",
          rows: 3,
          error: formErrors.reason,
          colSpan: 2 // Full width for reason
        }
      ]
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 text-center"
      >
        <h2 className="text-3xl font-bold mb-2" style={{ color: primaryColor }}>Complete Your Appointment Request</h2>
        <div className="bg-gray-100 inline-block px-4 py-2 rounded-full text-gray-700">
          <span className="font-medium">{selectedProviderName}</span> • {' '}
          <span>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span> • {' '}
          <span>{selectedTimeSlot?.time}</span> • {' '}
          <span>{selectedTimeSlot?.type === 'Telephone' ? 'Telephone' : 'In-person'}</span>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {formSections.map((section, sectionIndex) => (
          <React.Fragment key={`section-${sectionIndex}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (sectionIndex + 1) }}
              className="bg-gray-50 p-6 rounded-lg"
            >
              <h3 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">{section.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map((field, fieldIndex) => (
                  <div key={`field-${sectionIndex}-${fieldIndex}`} className={`${field.colSpan === 2 ? 'md:col-span-2' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        rows={field.rows || 3}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                          field.error ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
                        }`}
                        style={{ focusRing: `${primaryColor}40` }}
                      />
                    ) : field.type === 'select' ? (
                      <div>
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                            field.error ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
                          }`}
                          style={{ focusRing: `${primaryColor}40` }}
                        >
                          {field.options.map((option, optionIndex) => (
                            <option key={`option-${optionIndex}`} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {field.customContent}
                      </div>
                    ) : field.type === 'file' ? (
                      <div className="w-full">
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">{field.description}</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept={field.accept}
                              onChange={field.onChange}
                            />
                          </label>
                        </div>
                        {field.value && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              <span>{field.value.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(field.side)}
                                className="text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : field.type === 'datepicker' ? (
                      <DatePicker
                        selected={field.value ? new Date(field.value) : null}
                        onChange={field.onChange}
                        dateFormat="MM/dd/yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        maxDate={field.maxDate}
                        minDate={field.minDate}
                        yearDropdownItemNumber={field.yearRange}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                          field.error ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
                        }`}
                        placeholderText="MM/DD/YYYY"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${
                          field.error ? 'border-red-300' : 'border-gray-300 focus:ring-2 focus:ring-opacity-50'
                        }`}
                        style={{ focusRing: `${primaryColor}40` }}
                        placeholder={field.placeholder || ''}
                      />
                    )}

                    {field.error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-1 text-sm text-red-600"
                      >
                        {field.error}
                      </motion.p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
            
            {/* Add the note after Contact Details section */}
            {section.title === "Contact Details" && (
              <div className="text-sm text-gray-600 mb-6 text-center italic">
                You can add insurance information later, but it will be required before finalizing the appointment*
              </div>
            )}
          </React.Fragment>
        ))}

        {formErrors.submit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 text-sm mb-4"
          >
            {formErrors.submit}
          </motion.div>
        )}

        <motion.div
          className="flex flex-col sm:flex-row sm:justify-between pt-6 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleCancelAppointment}
            className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none font-medium"
          >
            Back
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting || localSubmitting}
            className="px-6 py-2.5 text-white rounded-md focus:outline-none transition-colors font-medium flex items-center justify-center"
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
              'Submit Appointment Request'
            )}
          </motion.button>
        </motion.div>

        <div className="text-center text-sm text-gray-500 pt-4">
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

// Wrap the form:
export default function AppointmentFormWithErrorBoundary(props) {
  return (
    <AppointmentFormErrorBoundary>
      <AppointmentForm {...props} />
    </AppointmentFormErrorBoundary>
  );
}