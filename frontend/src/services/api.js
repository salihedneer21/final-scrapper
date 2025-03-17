const API_BASE_URL = 'http://localhost:3004/api';

export const submitAppointmentForm = async (formData, href) => {
  try {
    // Add href to formData if not already present
    if (!formData.has('href')) {
      formData.append('href', href);
    }

    const response = await fetch(`${API_BASE_URL}/forms/submit`, {
      method: 'POST',
      body: formData,
      // Don't manually set Content-Type header for FormData
    }); 

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`
      }));
      throw new Error(errorData.message || 'Form submission failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};