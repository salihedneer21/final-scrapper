const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const path = require('path');
const CONFIG = require('./config');

// Helper function to pause execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Initialize logging
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌ ERROR' : type === 'warning' ? '⚠️ WARNING' : '✅ SUCCESS' ? '✅ SUCCESS' : 'ℹ️ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
};

// Create a class to handle the scraping process
class AppointmentScraper {
  constructor() {
    this.browsers = [];
    this.allAppointments = {}; // Will now be keyed by clinicianID instead of name
    this.filename = path.join(CONFIG.resultsDir, `appointments.json`);
    this.errorLog = path.join(CONFIG.resultsDir, `error-log.txt`);
    this.activeBrowsers = 0;
    this.browserPool = [];
    this.clinicianMap = {}; // Map clinicianID to clinician name for reference
  }

  // Save current results in case of crash
  async savePartialResults() {
    if (Object.keys(this.allAppointments).length > 0) {
      await fs.mkdir(CONFIG.resultsDir, { recursive: true });
      await fs.writeFile(this.filename, JSON.stringify(this.allAppointments, null, 2));
      
      // Also save clinician map for reference
      await fs.writeFile(
        path.join(CONFIG.resultsDir, 'clinician-map.json'),
        JSON.stringify(this.clinicianMap, null, 2)
      );
      
      log(`Results updated in ${this.filename}`, 'success');
    }
  }

  // Log error to file
  async logError(message, error, clinicianId = '', clinicianName = '') {
    const clinicianInfo = clinicianId ? 
      `(ID: ${clinicianId}${clinicianName ? `, Name: ${clinicianName}` : ''})` : 
      (clinicianName ? `(Name: ${clinicianName})` : '');
      
    const errorMessage = `[${new Date().toISOString()}] ${message}${clinicianInfo ? ` ${clinicianInfo}` : ''}: ${error.message}\n${error.stack}\n\n`;
    await fs.mkdir(CONFIG.resultsDir, { recursive: true });
    await fs.appendFile(this.errorLog, errorMessage);
    log(`${message}${clinicianInfo ? ` ${clinicianInfo}` : ''}: ${error.message}`, 'error');
  }

  // Create a new browser instance
  async createBrowser() {
    try {
      log(`Connecting to browser instance...`);
      const browser = await puppeteer.connect({ 
        browserWSEndpoint: CONFIG.connectionURL,
        headless: false,
        ignoreHTTPSErrors: true  // Added to ignore HTTPS errors
      });
      this.browsers.push(browser);
      this.browserPool.push(browser);
      this.activeBrowsers++;
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
      // If browser is disconnected, don't return it to the pool
      return;
    }
    this.browserPool.push(browser);
  }

  // Initialize a page with default settings
  async initPage(browser) {
    try {
      const page = await browser.newPage();
      
      // Set default timeout and user agent
      page.setDefaultTimeout(CONFIG.pageTimeout);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Optimize page performance
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        // Block unnecessary resources
        if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Add error handling for page errors
      page.on('error', error => {
        log(`Page error: ${error.message}`, 'error');
      });

      return page;
    } catch (error) {
      await this.logError('Failed to initialize page', error);
      throw error;
    }
  }

  // Navigate with retry logic
  async navigateWithRetry(page, url, options = {}) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= CONFIG.navigationRetries; attempt++) {
      try {
        if (attempt > 1) {
          log(`Navigation retry attempt ${attempt}/${CONFIG.navigationRetries}`, 'warning');
          await delay(CONFIG.retryDelay);
        }
        
        // Set longer timeout for retries
        const attemptOptions = {
          ...options,
          timeout: options.timeout || CONFIG.pageTimeout,
          waitUntil: options.waitUntil || 'networkidle2'
        };
        
        await page.goto(url, attemptOptions);
        return true;
      } catch (error) {
        lastError = error;
        log(`Navigation error on attempt ${attempt}: ${error.message}`, 'warning');
        
        // Try to recover from navigation error
        try {
          // Check if page is still functional by evaluating a simple expression
          await page.evaluate(() => document.title);
        } catch (evalError) {
          // Page is not usable, need to create a new one
          log(`Page crashed, will create a new page on next attempt`, 'warning');
          await page.close().catch(() => {});
          page = await this.initPage(await this.getBrowser());
        }
      }
    }
    
    throw lastError || new Error('Navigation failed after retries');
  }

  // Initialize the appointment search form with retry
  async initializeForm(page) {
    try {
      await this.navigateWithRetry(page, CONFIG.baseUrl, {
        waitUntil: 'networkidle2',
        timeout: CONFIG.pageTimeout
      });
      
      // Wait for form to be fully loaded
      await page.waitForSelector('#IsNewPatientInput', { timeout: 10000 });
      
      // No need to click IsNewPatientInput as it's selected by default
      // Simply wait for a moment to ensure the form is stable
      await delay(500);
      
      await page.select('#InputLocation', '-1');
      await delay(500);
      
      return page;
    } catch (error) {
      await this.logError('Failed to initialize form', error);
      throw error;
    }
  }

  // Get all available clinicians
  async getClinicians(page) {
    try {
      await page.waitForSelector('#InputSelectClinician', { timeout: 10000 });
      
      return await page.evaluate(() => {
        const select = document.querySelector('#InputSelectClinician');
        if (!select) return [];
        
        return Array.from(select.querySelectorAll('option'))
          .filter(option => option.value !== "" && option.value !== "-1")
          .map(option => ({
            id: option.value,
            name: option.textContent.trim()
          }));
      });
    } catch (error) {
      await this.logError('Failed to get clinicians', error);
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

  // Process a single clinician
  async processClinician(browser, clinician, clinicianIndex, totalClinicians) {
    let page = null;
    
    try {
      log(`Processing clinician ${clinicianIndex} of ${totalClinicians}: ${clinician.name} (ID: ${clinician.id})`);
      
      // Store in the map for reference
      this.clinicianMap[clinician.id] = clinician.name;
      
      // Initialize the clinician entry with the ID as key
      this.allAppointments[clinician.id] = {
        name: clinician.name // Store name as a property
      };
      
      // Check if browser is still valid
      if (!(await this.isBrowserValid(browser))) {
        log('Browser disconnected, creating new browser instance', 'warning');
        browser = await this.createBrowser();
      }
      
      page = await this.initPage(browser);
      await this.initializeForm(page);
      
      // Select the clinician
      await page.waitForSelector('#InputSelectClinician', { timeout: 10000 });
      await page.select('#InputSelectClinician', clinician.id);
      await delay(500);
      
      // Click View Available Times button
      log('Clicking View Available Times...');
      const submitButton = await page.waitForSelector('#ApptAvailabilityChecker__Submit-Button', { timeout: 10000 });
      await submitButton.click();
      
      // Wait for results to load with timeout handling
      try {
        await Promise.race([
          page.waitForSelector('.AvailableTimeSlot', { timeout: 30000 }),
          page.waitForSelector('.NoAvailableAppointments', { timeout: 30000 })
        ]);
      } catch (timeoutErr) {
        log(`Timeout waiting for results for ${clinician.name}, checking page content...`, 'warning');
      }
      
      // Add a delay to ensure page is fully loaded
      await delay(2000);
      
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
      
      // Try to find time slots
      const timeSlots = await page.evaluate(() => {
        const slots = document.querySelectorAll('.AvailableTimeSlot');
        if (slots.length > 0) {
          return Array.from(slots).map(slot => {
            const dateHeader = slot.closest('.CalendarDay')?.querySelector('.CalendarDayHeader')?.textContent.trim() || '';
            return {
              time: slot.textContent.trim(),
              href: slot.getAttribute('href') || '',
              date: dateHeader,
              id: slot.id || ''
            };
          });
        }
        
        // Alternative approach if needed
        const allLinks = document.querySelectorAll('a');
        return Array.from(allLinks)
          .filter(link => link.className.includes('TimeSlot') || link.id.includes('TimeSlot'))
          .map(slot => {
            const dateHeader = slot.closest('.CalendarDay')?.querySelector('.CalendarDayHeader')?.textContent.trim() || '';
            return {
              time: slot.textContent.trim(),
              href: slot.getAttribute('href') || '',
              date: dateHeader,
              id: slot.id || ''
            };
          });
      });
      
      if (!timeSlots || timeSlots.length === 0) {
        log(`No time slots found for ${clinician.name} (ID: ${clinician.id})`);
        this.allAppointments[clinician.id].status = 'no_slots_found';
        
        // Take a screenshot for debugging if enabled
        if (CONFIG.debug) {
          await fs.mkdir(CONFIG.resultsDir, { recursive: true });
          const debugFilename = `debug-${clinician.id}`;
          await page.screenshot({ path: path.join(CONFIG.resultsDir, `${debugFilename}.png`) });
          await fs.writeFile(
            path.join(CONFIG.resultsDir, `${debugFilename}.html`), 
            await page.content()
          );
        }
        
        await page.close().catch(() => {});
        return;
      }
      
      log(`Found ${timeSlots.length} time slots for ${clinician.name} (ID: ${clinician.id})`);
      this.allAppointments[clinician.id].slots = [];
      
      // Process each time slot - WITHOUT opening new tabs
      for (const slot of timeSlots) {
        this.allAppointments[clinician.id].slots.push({
          date: slot.date,
          time: slot.time,
          status: 'listed',
          href: slot.href || '#'
        });
      }
      
    } catch (error) {
      await this.logError(`Error processing clinician`, error, clinician.id, clinician.name);
      this.allAppointments[clinician.id] = { 
        name: clinician.name,
        status: 'error',
        error: error.message
      };
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
      
      // Return the browser to the pool for reuse
      this.returnBrowser(browser);
    }
  }

  // Process a batch of clinicians
  async processBatch(clinicianBatch, batchIndex, totalBatches) {
    log(`Processing batch ${batchIndex} of ${totalBatches} with ${clinicianBatch.length} clinicians`);
    
    try {
      // Create browser instances for this batch if needed
      const browsersNeeded = Math.min(clinicianBatch.length, CONFIG.concurrentBrowsers);
      while (this.browserPool.length < browsersNeeded) {
        await this.createBrowser();
        // Add slight delay between browser creations
        await delay(1000);
      }
      
      // Process each clinician with rate limiting
      const tasks = [];
      for (let i = 0; i < clinicianBatch.length; i++) {
        const clinician = clinicianBatch[i];
        const clinicianIndex = i + (batchIndex - 1) * CONFIG.cliniciansPerBatch + 1;
        
        // Get a browser from the pool
        const browser = await this.getBrowser();
        
        // Process this clinician
        const task = this.processClinician(
          browser, 
          clinician, 
          clinicianIndex, 
          this.totalClinicians
        );
        
        tasks.push(task);
        
        // Add delay between starting new clinician processing
        await delay(CONFIG.delayBetweenClinicians);
      }
      
      // Wait for all tasks to complete
      await Promise.all(tasks);
      
      // Save results after batch completes
      await this.savePartialResults();
      
    } catch (error) {
      await this.logError(`Error processing batch ${batchIndex}`, error);
    }
  }

  // Main execution function
  async run() {
    try {
      log('Starting appointment scraper...');
      
      // Create results directory
      await fs.mkdir(CONFIG.resultsDir, { recursive: true });
      
      // Check if we should ignore existing results (force refresh)
      const forceRefresh = process.argv.includes('--refresh');
      if (forceRefresh) {
        log('Refresh mode: Will process all clinicians regardless of existing data');
      }
      
      // Initialize a browser to get clinician list
      const initialBrowser = await this.createBrowser();
      const initialPage = await this.initPage(initialBrowser);
      await this.initializeForm(initialPage);
      
      // Get all clinicians
      const clinicians = await this.getClinicians(initialPage);
      this.totalClinicians = clinicians.length;
      log(`Found ${clinicians.length} clinicians`);
      
      // Create clinician map for reference
      clinicians.forEach(c => {
        this.clinicianMap[c.id] = c.name;
      });
      
      // Close initial page but keep browser for reuse
      await initialPage.close();
      this.returnBrowser(initialBrowser);
      
      // Load existing results if they exist
      if (!forceRefresh) {
        try {
          const existingData = await fs.readFile(this.filename, 'utf-8');
          this.allAppointments = JSON.parse(existingData);
          log(`Loaded existing results from ${this.filename}`, 'success');
          
          // Filter out clinicians that have already been processed
          const processedClinicianIds = Object.keys(this.allAppointments);
          const remainingClinicians = clinicians.filter(c => !processedClinicianIds.includes(c.id));
          
          if (remainingClinicians.length < clinicians.length) {
            log(`Skipping ${clinicians.length - remainingClinicians.length} already processed clinicians`);
            if (remainingClinicians.length === 0) {
              log('All clinicians already processed!', 'success');
              return;
            }
            clinicians.length = 0;
            clinicians.push(...remainingClinicians);
          }
        } catch (e) {
          // No existing results or error parsing them, start fresh
          log('Starting with fresh results');
        }
      } else {
        log('Refresh mode: Ignoring any existing results and starting fresh');
      }
      
      // Divide clinicians into batches
      const batches = [];
      for (let i = 0; i < clinicians.length; i += CONFIG.cliniciansPerBatch) {
        batches.push(clinicians.slice(i, i + CONFIG.cliniciansPerBatch));
      }
      
      // Process each batch sequentially
      for (let i = 0; i < batches.length; i++) {
        await this.processBatch(batches[i], i + 1, batches.length);
        // Add delay between batches
        if (i < batches.length - 1) {
          log('Pausing between batches to reduce server load...');
          await delay(10000); // 10 seconds between batches
        }
      }
      
      log('Scraping completed successfully!', 'success');
      
    } catch (error) {
      await this.logError('Fatal error in scraper', error);
    } finally {
      // Close all browser instances
      for (const browser of this.browsers) {
        await browser.close().catch(() => {});
      }
      log('All browsers closed');
      
      // Final save
      await this.savePartialResults();
    }
  }
}

// Run the scraper
(async () => {
  try {
    const scraper = new AppointmentScraper();
    await scraper.run();
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
})();

async function testScraper() {
    console.log('Starting test scraper...');
    let browser;
    const allAppointments = {};
    
    try {

        // Save results to standardized file
        const outputPath = path.join(CONFIG.resultsDir, CONFIG.appointmentsFile);
        await fs.mkdir(CONFIG.resultsDir, { recursive: true });
        await fs.writeFile(outputPath, JSON.stringify(allAppointments, null, 2));
        console.log(`Results saved to ${outputPath}`);

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}