const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const CONFIG = require('./config');

// Helper function to pause execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Initialize logging
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌ ERROR' : type === 'warning' ? '⚠️ WARNING' : type === 'success' ? '✅ SUCCESS' : 'ℹ️ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
};

// Retry class specifically for error cases
class ErrorRetryScraper {
  constructor() {
    this.browsers = [];
    this.allAppointments = {};
    this.filename = path.join(CONFIG.resultsDir, CONFIG.appointmentsFile);
    this.errorLog = path.join(CONFIG.resultsDir, 'error-retry-log.txt');
    this.browserPool = [];
    this.clinicianMap = {};
    this.errorClinicians = [];
  }

  // Save results back to the main appointments file
  async saveResults() {
    if (Object.keys(this.allAppointments).length > 0) {
      await fs.writeFile(this.filename, JSON.stringify(this.allAppointments, null, 2));
      log(`Results updated in ${this.filename}`, 'success');
    }
  }

  // Log error to file
  async logError(message, error, clinicianId = '', clinicianName = '') {
    const clinicianInfo = clinicianId ? 
      `(ID: ${clinicianId}${clinicianName ? `, Name: ${clinicianName}` : ''})` : 
      (clinicianName ? `(Name: ${clinicianName})` : '');
      
    const errorMessage = `[${new Date().toISOString()}] ${message}${clinicianInfo ? ` ${clinicianInfo}` : ''}: ${error.message}\n${error.stack}\n\n`;
    await fs.appendFile(this.errorLog, errorMessage);
    log(`${message}${clinicianInfo ? ` ${clinicianInfo}` : ''}: ${error.message}`, 'error');
  }

  // Create browser with increased protocol timeout
  async createBrowser() {
    try {
      log(`Connecting to browser instance with increased timeout...`);
      const browser = await puppeteer.connect({ 
        browserWSEndpoint: CONFIG.connectionURL,
        headless: false,
        ignoreHTTPSErrors: true,
        // Add increased protocol timeout for error cases
        protocolTimeout: 120000 // 2 minutes timeout instead of default 30 seconds
      });
      this.browsers.push(browser);
      this.browserPool.push(browser);
      return browser;
    } catch (error) {
      await this.logError('Failed to create browser instance', error);
      throw error;
    }
  }

  // Get a browser from the pool or create a new one
  async getBrowser() {
    if (this.browserPool.length > 0) {
      return this.browserPool.shift();
    }
    return await this.createBrowser();
  }

  // Return a browser to the pool
  returnBrowser(browser) {
    if (browser && !browser.isConnected) {
      return;
    }
    this.browserPool.push(browser);
  }

  // Initialize a page with default settings
  async initPage(browser) {
    try {
      const page = await browser.newPage();
      
      // Set longer timeout for error retries
      const longerTimeout = CONFIG.pageTimeout * 2;
      page.setDefaultTimeout(longerTimeout);
      
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      
      // Optimize page performance with less aggressive filtering for error cases
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'image' || resourceType === 'font') {
          req.abort();
        } else {
          req.continue();
        }
      });

      page.on('error', error => {
        log(`Page error: ${error.message}`, 'error');
      });

      return page;
    } catch (error) {
      await this.logError('Failed to initialize page', error);
      throw error;
    }
  }

  // Navigate with additional retries for error cases
  async navigateWithRetry(page, url, options = {}) {
    // Additional retries for error cases
    const errorRetries = CONFIG.navigationRetries * 2;
    let lastError = null;
    
    for (let attempt = 1; attempt <= errorRetries; attempt++) {
      try {
        if (attempt > 1) {
          log(`Navigation retry attempt ${attempt}/${errorRetries}`, 'warning');
          // Longer delay for error retries
          await delay(CONFIG.retryDelay * 2);
        }
        
        const attemptOptions = {
          ...options,
          timeout: options.timeout || CONFIG.pageTimeout * 2,
          waitUntil: 'networkidle2'
        };
        
        await page.goto(url, attemptOptions);
        return true;
      } catch (error) {
        lastError = error;
        log(`Navigation error on attempt ${attempt}: ${error.message}`, 'warning');
        
        try {
          await page.evaluate(() => document.title);
        } catch (evalError) {
          log(`Page crashed, creating new page`, 'warning');
          await page.close().catch(() => {});
          page = await this.initPage(await this.getBrowser());
        }
      }
    }
    
    throw lastError || new Error('Navigation failed after retries');
  }

  // Initialize the appointment search form
  async initializeForm(page) {
    try {
      await this.navigateWithRetry(page, CONFIG.baseUrl, {
        waitUntil: 'networkidle2',
        timeout: CONFIG.pageTimeout * 2
      });
      
      // Wait for form to load
      await page.waitForSelector('#IsNewPatientInput', { timeout: 20000 });
      
      // No need to click IsNewPatientInput as it's selected by default
      // Just wait a moment to ensure the form is stable
      await delay(1000);
      
      await page.select('#InputLocation', '-1');
      await delay(1000);
      
      return page;
    } catch (error) {
      await this.logError('Failed to initialize form', error);
      throw error;
    }
  }

  // Check if a browser is still valid
  async isBrowserValid(browser) {
    try {
      await browser.version();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Process a single error clinician
  async processClinician(browser, clinician, index, total) {
    let page = null;
    
    try {
      log(`Retry ${index} of ${total}: ${clinician.name} (ID: ${clinician.id})`);
      
      // Check if browser is still valid
      if (!(await this.isBrowserValid(browser))) {
        log('Browser disconnected, creating new browser instance', 'warning');
        browser = await this.createBrowser();
      }
      
      page = await this.initPage(browser);
      await this.initializeForm(page);
      
      // Select the clinician
      await page.waitForSelector('#InputSelectClinician', { timeout: 20000 });
      await page.select('#InputSelectClinician', clinician.id);
      await delay(1000);
      
      // Click View Available Times button with additional waitForSelector
      log('Clicking View Available Times...');
      const submitButton = await page.waitForSelector('#ApptAvailabilityChecker__Submit-Button', { timeout: 20000 });
      await submitButton.click();
      
      // Longer wait for results
      try {
        await Promise.race([
          page.waitForSelector('.AvailableTimeSlot', { timeout: 60000 }),
          page.waitForSelector('.NoAvailableAppointments', { timeout: 60000 })
        ]);
      } catch (timeoutErr) {
        log(`Timeout waiting for results for ${clinician.name}, checking page content...`, 'warning');
      }
      
      // Longer delay to ensure page is fully loaded
      await delay(5000);
      
      // Check content for no appointments message
      const hasNoAppointments = await page.evaluate(() => {
        return document.body.textContent.includes('No available appointments') || 
               document.querySelector('.NoAvailableAppointments') !== null;
      });
      
      if (hasNoAppointments) {
        log(`No available appointments for ${clinician.name} (ID: ${clinician.id})`);
        this.allAppointments[clinician.id].status = 'no_appointments';
        await page.close().catch(() => {});
        return;
      }
      
      // Try to find time slots with more resilient selector
      const timeSlots = await page.evaluate(() => {
        // Try different selectors to maximize chances of finding slots
        const selectors = [
          '.AvailableTimeSlot',
          'a[href*="timeSlot="]',
          '.TimeSlot',
          'a[id*="TimeSlot"]',
          'a[onclick*="TimeSlot"]'
        ];
        
        // Try each selector
        for (const selector of selectors) {
          const slots = document.querySelectorAll(selector);
          if (slots.length > 0) {
            return Array.from(slots).map(slot => {
              // Try to find date header with more resilient approach
              let dateHeader = '';
              let parent = slot;
              // Walk up to 5 levels up trying to find date header
              for (let i = 0; i < 5; i++) {
                parent = parent.parentElement;
                if (!parent) break;
                
                const dateElement = parent.querySelector('.CalendarDayHeader') || 
                                   parent.querySelector('[class*="day-header"]') ||
                                   parent.querySelector('h3') ||
                                   parent.querySelector('h4');
                                   
                if (dateElement) {
                  dateHeader = dateElement.textContent.trim();
                  break;
                }
              }
              
              return {
                time: slot.textContent.trim(),
                href: slot.getAttribute('href') || '',
                date: dateHeader,
                id: slot.id || ''
              };
            });
          }
        }
        
        // If all selectors failed, return empty array
        return [];
      });
      
      if (!timeSlots || timeSlots.length === 0) {
        log(`No time slots found for ${clinician.name} (ID: ${clinician.id})`);
        this.allAppointments[clinician.id].status = 'no_slots_found';
        await page.close().catch(() => {});
        return;
      }
      
      log(`Found ${timeSlots.length} time slots for ${clinician.name} (ID: ${clinician.id})`, 'success');
      
      // Update the all appointments data for this clinician
      this.allAppointments[clinician.id] = {
        name: clinician.name,
        slots: timeSlots.map(slot => ({
          date: slot.date,
          time: slot.time,
          status: 'listed',
          href: slot.href || '#'
        }))
      };
      
      
    } catch (error) {
      await this.logError(`Error retrying clinician`, error, clinician.id, clinician.name);
      // Keep the existing error in the appointments data
      log(`Retry failed for clinician ${clinician.id}`, 'error');
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
      this.returnBrowser(browser);
    }
  }

  // Find all clinicians with errors in the appointments data
  async findErrorClinicians() {
    try {
      // Read the appointments data file
      const data = await fs.readFile(this.filename, 'utf8');
      this.allAppointments = JSON.parse(data);
      
      // Find clinicians with errors
      this.errorClinicians = [];
      for (const [id, info] of Object.entries(this.allAppointments)) {
        if (info.status === 'error') {
          this.errorClinicians.push({
            id,
            name: info.name,
            error: info.error
          });
        }
      }
      
      log(`Found ${this.errorClinicians.length} clinicians with errors to retry`);
      return this.errorClinicians.length > 0;
    } catch (error) {
      await this.logError('Failed to load appointments data', error);
      return false;
    }
  }

  // Main execution function
  async run() {
    try {
      log('Starting error retry scraper...');
      
      // Create log directory
      await fs.mkdir(CONFIG.resultsDir, { recursive: true });
      
      // Find clinicians with errors to retry
      const hasErrors = await this.findErrorClinicians();
      if (!hasErrors) {
        log('No error clinicians found, nothing to retry!', 'success');
        return;
      }
      
      // Create browser instances
      const initialBrowser = await this.createBrowser();
      
      // Process each error clinician with some delay between
      for (let i = 0; i < this.errorClinicians.length; i++) {
        const clinician = this.errorClinicians[i];
        await this.processClinician(
          initialBrowser, 
          clinician, 
          i + 1, 
          this.errorClinicians.length
        );
        
        // Save after each clinician to preserve progress
        await this.saveResults();
        
        // Add delay between clinicians to reduce server load
        if (i < this.errorClinicians.length - 1) {
          log('Adding delay between retries...');
          await delay(5000);
        }
      }
      
      log('Error retry completed successfully!', 'success');
      
    } catch (error) {
      await this.logError('Fatal error in retry scraper', error);
    } finally {
      // Close all browser instances
      for (const browser of this.browsers) {
        await browser.close().catch(() => {});
      }
      log('All browsers closed');
      
      // Final save
      await this.saveResults();
    }
  }
}

// Run the retry scraper
(async () => {
  try {
    const retryScraper = new ErrorRetryScraper();
    await retryScraper.run();
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
})();