/**
 * Middleware for validating form submission data
 */
const validateFormSubmission = (req, res, next) => {
  const { formData, href } = req.body;
  
  // Check if formData and href exist
  if (!formData || !href) {
    return res.status(400).json({
      success: false,
      message: 'formData and href are required'
    });
  }
  
  // Validate formData structure
  const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'phone', 'email'];
  const missingFields = requiredFields.filter(field => !formData[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Missing required fields: ${missingFields.join(', ')}` 
    });
  }
  
  // Validate href format
  if (!href.startsWith('https://www.therapyportal.com/p/')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment URL format'
    });
  }
  
  // Validation passed, proceed
  next();
};

module.exports = {
  validateFormSubmission
};