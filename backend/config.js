const CONFIG = {
    connectionURL: 'wss://brd-customer-hl_96efb287-zone-scraping_browser1:727k0039ywnh@brd.superproxy.io:9222',
    baseUrl: 'https://www.therapyportal.com/p/crownc/appointments/availability/',
    concurrentBrowsers: 2,
    cliniciansPerBatch: 4,
    delayBetweenClinicians: 1200,
    pageTimeout: 60000,
    navigationRetries: 3,
    retryDelay: 5000,
    resultsDir: './results',
    debug: false,
    // Add file paths
    appointmentsFile: 'appointments.json',
    locationsFile: 'appointments-with-locations.json',
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000,
    BATCH_SIZE: 5,
    RATE_LIMIT_DELAY: 1000,
    
    // Add these MongoDB configuration settings
    mongodb: {
        uri: process.env.MONGO_URI || 'mongodb+srv://salihedneer21:JoAcqvXHoCFr5C3U@cluster0.qubhv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
    },
    resultsDir: './results', // Directory where the appointments.json file is stored
    appointmentsFile: 'appointments.json', // Name of the appointments file
};

module.exports = CONFIG;