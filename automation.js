// const { chromium } = require('playwright');
// const fs = require('fs');
// const path = require('path');

// const activeBrowsers = new Set(); 

// async function takeEvidence(page, selector, actionName, jobId) {
//   const evidenceDir = path.join(__dirname, 'evidence', jobId);
//   fs.mkdirSync(evidenceDir, { recursive: true });

//   const locator = page.locator(selector).first(); 
//   await locator.waitFor({ state: 'visible', timeout: 15000 });

//   // 1. Inject the red highlight AND wait for the browser to paint it
//   await locator.evaluate(async (el) => {
//     el.style.outline = '4px solid red';
//     el.style.boxShadow = '0 0 10px red';
    
//     // Force the browser to calculate the new layout (reflow)
//     el.getBoundingClientRect();
    
//     // Wait for the next animation frame (the actual paint)
//     await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
//   });

//   // 2. Take the screenshot (no hard waits!)
//   const screenshotPath = path.join(evidenceDir, `${actionName}.png`);
//   await page.screenshot({ path: screenshotPath, fullPage: true });

//   // 3. Remove the highlight
//   await locator.evaluate((el) => {
//     el.style.outline = '';
//     el.style.boxShadow = '';
//   });
// }

// async function runJob(rowData, jobId) {
//   const startTime = Date.now();
  
//   // --- FIX 1: DELETE OLD EVIDENCE SO NO GHOST IMAGES SHOW UP ---
//   const evidenceDir = path.join(__dirname, 'evidence', jobId);
//   if (fs.existsSync(evidenceDir)) {
//     fs.rmSync(evidenceDir, { recursive: true, force: true });
//   }
//   fs.mkdirSync(evidenceDir, { recursive: true });
//   // ------------------------------------------------------------

//   const browser = await chromium.launch({ headless: false });
//   activeBrowsers.add(browser);
  
//   const context = await browser.newContext({ ignoreHTTPSErrors: true });
//   const page = await context.newPage();

//   try {
//     const targetUrl = process.env.STAGE_URL || 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
//     const username = process.env.STAGE_USERNAME || 'Admin';
//     const password = process.env.STAGE_PASSWORD || 'admin123';
//     const firstNameToCreate = rowData.InputValue || rowData.ProjectName || 'John';

//     // --- 1. LOGIN FLOW ---
//     await page.goto(targetUrl, { timeout: 30000 });
    
//     await page.fill('input[name="username"]', username);
//     await page.fill('input[name="password"]', password);
//     await page.click('button[type="submit"]');
    
//     await page.waitForSelector('.oxd-topbar-header-breadcrumb', { timeout: 15000 });

//     // --- 2. NAVIGATE TO CREATE ---
//     await page.click('span:has-text("PIM")');
//     await page.waitForSelector('a:has-text("Add Employee")');
//     await page.click('a:has-text("Add Employee")');

//     // --- 3. FILL DATA ---
//     await page.waitForSelector('input[name="firstName"]');
//     await page.fill('input[name="firstName"]', firstNameToCreate);
//     await page.fill('input[name="lastName"]', 'TestUser');
    
//     await takeEvidence(page, 'input[name="firstName"]', '01_Project_Created', jobId);

//     // --- 4. TRANSMIT (SAVE) ---
//     await page.click('button[type="submit"]');
//     await page.waitForSelector('.oxd-toast--success', { timeout: 10000 });
    
//     await takeEvidence(page, '.oxd-toast--success', '02_Transmitted_Success', jobId);

//     return { 
//       status: 'Passed', 
//       message: `Employee ${firstNameToCreate} created successfully`,
//       duration: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
//     };

//   } catch (error) {
//     // --- FIX 2: TAKE SCREENSHOT ON FAILURE ---
//     try {
//       await page.screenshot({ path: path.join(evidenceDir, '99_Failure_State.png'), fullPage: true });
//     } catch (e) {
//       console.log("Could not take failure screenshot");
//     }
//     // ----------------------------------------

//     return { 
//       status: 'Failed', 
//       message: error.message.split('\n')[0], 
//       duration: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
//     };
//   } finally {
//     activeBrowsers.delete(browser);
//     await browser.close();
//   }
// }

// async function stopAllBrowsers() {
//   for (const browser of activeBrowsers) {
//     try { await browser.close(); } catch (e) {}
//   }
//   activeBrowsers.clear();
// }

// module.exports = { runJob, stopAllBrowsers };



const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const activeBrowsers = new Set(); 

async function takeEvidence(page, selector, actionName, jobId) {
  const evidenceDir = path.join(__dirname, 'evidence', jobId);
  fs.mkdirSync(evidenceDir, { recursive: true });

  const locator = page.locator(selector).first(); 
  // Wait for the element to be in the DOM and visible
  await locator.waitFor({ state: 'visible', timeout: 15000 });

  // Inject a highly visible red highlight and bring to front
  await locator.evaluate((el) => {
    el.style.outline = '5px solid red';
    el.style.boxShadow = '0 0 15px red';
    el.style.zIndex = '9999';
    el.style.position = 'relative';
  });

  // Wait 200ms just to guarantee the browser paints the red box on the screen
  await page.waitForTimeout(200);

  // Take the screenshot
  const screenshotPath = path.join(evidenceDir, `${actionName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Remove the highlight
  await locator.evaluate((el) => {
    el.style.outline = '';
    el.style.boxShadow = '';
    el.style.zIndex = '';
    el.style.position = '';
  });
}

async function runJob(rowData, jobId) {
  const startTime = Date.now();
  
  const evidenceDir = path.join(__dirname, 'evidence', jobId);
  if (fs.existsSync(evidenceDir)) {
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
  fs.mkdirSync(evidenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  activeBrowsers.add(browser);
  
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    const targetUrl = process.env.STAGE_URL || 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
    const username = process.env.STAGE_USERNAME || 'Admin';
    const password = process.env.STAGE_PASSWORD || 'admin123';
    const firstNameToCreate = rowData.InputValue || rowData.ProjectName || 'John';

    // --- 1. LOGIN FLOW ---
    await page.goto(targetUrl, { timeout: 30000 });
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForSelector('.oxd-topbar-header-breadcrumb', { timeout: 15000 });

    // --- 2. NAVIGATE TO CREATE ---
    await page.click('span:has-text("PIM")');
    await page.waitForSelector('a:has-text("Add Employee")');
    await page.click('a:has-text("Add Employee")');

    // --- THE CRUCIAL FIX: WAIT FOR SPINNERS TO DISAPPEAR ---
    // OrangeHRM uses a spinner overlay while loading pages. We must wait for it to hide.
    await page.waitForTimeout(1000); // Give the SPA a second to start routing
    await page.locator('.oxd-loading-spinner').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForSelector('input[name="firstName"]', { state: 'visible' });
    // -------------------------------------------------------

    // --- 3. FILL DATA ---
    await page.fill('input[name="firstName"]', firstNameToCreate);
    await page.fill('input[name="lastName"]', 'TestUser');
    
    // Take screenshot (now that the page is fully loaded)
    await takeEvidence(page, 'input[name="firstName"]', '01_Project_Created', jobId);

    // --- 4. TRANSMIT (SAVE) ---
    await page.click('button[type="submit"]');
    
    // Wait for the toast
    await page.waitForSelector('.oxd-toast--success', { timeout: 10000 });
    
    // Take screenshot of the success toast
    await takeEvidence(page, '.oxd-toast--success', '02_Transmitted_Success', jobId);

    return { 
      status: 'Passed', 
      message: `Employee ${firstNameToCreate} created successfully`,
      duration: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
    };

  } catch (error) {
    try {
      await page.screenshot({ path: path.join(evidenceDir, '99_Failure_State.png'), fullPage: true });
    } catch (e) {}

    return { 
      status: 'Failed', 
      message: error.message.split('\n')[0], 
      duration: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
    };
  } finally {
    activeBrowsers.delete(browser);
    await browser.close();
  }
}

async function stopAllBrowsers() {
  for (const browser of activeBrowsers) {
    try { await browser.close(); } catch (e) {}
  }
  activeBrowsers.clear();
}

module.exports = { runJob, stopAllBrowsers };