/**
 * Location ID to name mapping for TherapyPortal
 */
const LOCATIONS = {
  '250637': 'Main Office 1',
  '232862': 'Main Office 2',
  '232863': 'Main Office 3',
  '232864': 'Main Office 4',
  '232865': 'Main Office 5',
  '232866': 'Main Office 6',
  '172794': 'Telehealth',
  '233904': 'Hamaspik Residence'
};

// Reverse mapping for lookups by name
const LOCATION_IDS = {};
Object.entries(LOCATIONS).forEach(([id, name]) => {
  LOCATION_IDS[name] = id;
});

module.exports = {
  LOCATIONS,
  LOCATION_IDS
};