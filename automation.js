// const { chromium } = require('playwright');
// const fs = require('fs');
// const path = require('path');

// const activeBrowsers = new Set(); 

// async function takeEvidence(page, selector, actionName, jobId) {
//   const evidenceDir = path.join(__dirname, 'evidence', jobId);
//   fs.mkdirSync(evidenceDir, { recursive: true });

//   const locator = page.locator(selector).first(); 
//   await locator.waitFor({ state: 'visible', timeout: 15000 });

//   await locator.evaluate((el) => {
//     el.style.outline = '5px solid red';
//     el.style.boxShadow = '0 0 15px red';
//     el.style.zIndex = '9999';
//     el.style.position = 'relative';
//   });

//   await page.waitForTimeout(200);

//   const screenshotPath = path.join(evidenceDir, `${actionName}.png`);
//   await page.screenshot({ path: screenshotPath, fullPage: true });

//   await locator.evaluate((el) => {
//     el.style.outline = '';
//     el.style.boxShadow = '';
//     el.style.zIndex = '';
//     el.style.position = '';
//   });
// }

// async function runJob(rowData, jobId) {
//   const startTime = Date.now();
  
//   const evidenceDir = path.join(__dirname, 'evidence', jobId);
//   if (fs.existsSync(evidenceDir)) {
//     fs.rmSync(evidenceDir, { recursive: true, force: true });
//   }
//   fs.mkdirSync(evidenceDir, { recursive: true });

//   const isHeadless = process.env.HEADLESS === 'true';
//   const browser = await chromium.launch({ headless: isHeadless });
//   activeBrowsers.add(browser);
  
//   const context = await browser.newContext({ ignoreHTTPSErrors: true });
//   const page = await context.newPage();

//   try {
//     let steps = [];
//     if (typeof rowData.Steps === 'string') {
//       try {
//         steps = JSON.parse(rowData.Steps);
//       } catch (e) {
//         throw new Error("Invalid JSON format in the 'Steps' column.");
//       }
//     } else if (Array.isArray(rowData.Steps)) {
//       steps = rowData.Steps;
//     } else {
//       throw new Error("No 'Steps' provided for this job.");
//     }

//     if (steps.length === 0) throw new Error("Steps array is empty.");

//     for (const step of steps) {
//       const action = step.action.toLowerCase();
//       let value = step.value || '';

//       // Environment Variable replacement (e.g., {{STAGE_USERNAME}})
//       if (value.startsWith('{{') && value.endsWith('}}')) {
//         const envKey = value.replace('{{', '').replace('}}', '');
//         value = process.env[envKey] || value;
//       }

//       console.log(`[${jobId}] Executing: ${action} on ${step.selector || ''}`);

//       // THIS IS THE SWITCH BLOCK YOU WERE MISSING
//       switch (action) {
//         case 'goto':
//           await page.goto(step.selector, { timeout: 30000 });
//           break;
          
//         case 'app_login':
//           const url = process.env.STAGE_URL;
//           const username = process.env.STAGE_USERNAME;
//           const password = process.env.STAGE_PASSWORD;
          
//           if (!url || !username || !password) {
//             throw new Error("Missing STAGE_URL, STAGE_USERNAME, or STAGE_PASSWORD in .env file.");
//           }

//           await page.goto(url, { timeout: 30000 });
//           await page.fill('input[name="username"]', username);
//           await page.fill('input[name="password"]', password);
//           await page.click('button[type="submit"]');
//           await page.waitForSelector('.oxd-topbar-header-breadcrumb', { timeout: 20000 });
//           break;

//         case 'fill':
//           // Wait for the input to be visible before trying to type
//           await page.waitForSelector(step.selector, { state: 'visible', timeout: 15000 });
//           await page.fill(step.selector, value.toString());
//           break;
          
//         case 'click':
//           // Wait for the button/link to be visible before clicking
//           await page.waitForSelector(step.selector, { state: 'visible', timeout: 15000 });
//           await page.click(step.selector);
//           break;
          
//         case 'wait':
//           await page.waitForTimeout(parseInt(value) || 1000);
//           break;
        
//         case 'waitforurl':
//           await page.waitForURL(value, { timeout: 15000 });
//           break;
          
//         case 'waitforselector':
//           await page.waitForSelector(step.selector, { state: 'visible', timeout: 15000 });
//           break;
          
//         case 'press':
//           await page.press(step.selector, value);
//           break;
          
//         case 'screenshot':
//           await takeEvidence(page, step.selector, value || 'Screenshot', jobId);
//           break;
          
//         default:
//           throw new Error(`Unknown action: '${step.action}'`);
//       }
//     }

//     return { 
//       status: 'Passed', 
//       message: `Completed ${steps.length} steps successfully`,
//       duration: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
//     };

//   } catch (error) {
//     try {
//       await page.screenshot({ path: path.join(evidenceDir, '99_Failure_State.png'), fullPage: true });
//     } catch (e) {}

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
  await locator.waitFor({ state: 'visible', timeout: 15000 });

  await locator.evaluate((el) => {
    el.style.outline = '5px solid red';
    el.style.boxShadow = '0 0 15px red';
    el.style.zIndex = '9999';
    el.style.position = 'relative';
  });

  await page.waitForTimeout(200);

  const screenshotPath = path.join(evidenceDir, `${actionName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

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
  if (fs.existsSync(evidenceDir)) fs.rmSync(evidenceDir, { recursive: true, force: true });
  fs.mkdirSync(evidenceDir, { recursive: true });

  const isHeadless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless: isHeadless });
  activeBrowsers.add(browser);
  
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    let result;

   // --- ROUTER: Check if we are running a custom JS Test or a JSON Step ---
    if (rowData.TestName) {
      try {
        // 1. Dynamically find the test file based on the TestName in Excel
        const testFilePath = path.join(__dirname, 'tests', `${rowData.TestName}.js`);
        
        if (!fs.existsSync(testFilePath)) {
          throw new Error(`Test file not found: tests/${rowData.TestName}.js`);
        }

        const testModule = require(testFilePath);
        
        // 2. Find the function (e.g., if TestName is "CreateProject", look for "runCreateProject")
        const functionName = `run${rowData.TestName}`;
        const runTestFunction = testModule[functionName];

        if (typeof runTestFunction !== 'function') {
          throw new Error(`Function '${functionName}' not found in tests/${rowData.TestName}.js`);
        }

        // 3. Execute the test and pass the page and data
        result = await runTestFunction(page, rowData, jobId);

      } catch (err) {
        throw new Error(`Failed to load TestName '${rowData.TestName}': ${err.message}`);
      }
    } else if (rowData.Steps) {
      // MODE 1: JSON Steps (Keep this exactly as it is)
      let steps = typeof rowData.Steps === 'string' ? JSON.parse(rowData.Steps) : rowData.Steps;
      
      for (const step of steps) {
        const action = step.action.toLowerCase();
        let value = step.value || '';

        if (value.startsWith('{{') && value.endsWith('}}')) {
          const envKey = value.replace('{{', '').replace('}}', '');
          value = process.env[envKey] || value;
        }

        switch (action) {
          case 'goto': await page.goto(step.selector, { timeout: 30000 }); break;
          case 'app_login':
            await page.goto(process.env.STAGE_URL, { timeout: 30000 });
            await page.fill('input[name="username"]', process.env.STAGE_USERNAME);
            await page.fill('input[name="password"]', process.env.STAGE_PASSWORD);
            await page.click('button[type="submit"]');
            await page.waitForSelector('.oxd-topbar-header-breadcrumb', { timeout: 20000 });
            break;
          case 'fill': await page.waitForSelector(step.selector); await page.fill(step.selector, value.toString()); break;
          case 'click': await page.waitForSelector(step.selector); await page.click(step.selector); break;
          case 'wait': await page.waitForTimeout(parseInt(value) || 1000); break;
          case 'waitforurl': await page.waitForURL(value, { timeout: 15000 }); break;
          case 'waitforselector': await page.waitForSelector(step.selector, { state: 'visible', timeout: 15000 }); break;
          case 'screenshot': await takeEvidence(page, step.selector, value || 'Screenshot', jobId); break;
          default: throw new Error(`Unknown action: '${step.action}'`);
        }
      }
      result = { status: 'Passed', message: 'Completed JSON steps' };
    } else {
      throw new Error("Must provide either 'TestName' or 'Steps' in JSON.");
    }

    return { 
      ...result, // Returns status, message, and extractedData
      duration: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
    };

  } catch (error) {
    try { await page.screenshot({ path: path.join(evidenceDir, '99_Failure_State.png'), fullPage: true }); } catch (e) {}
    return { status: 'Failed', message: error.message.split('\n')[0], duration: ((Date.now() - startTime) / 1000).toFixed(1) + 's' };
  } finally {
    activeBrowsers.delete(browser);
    await browser.close();
  }
}

async function stopAllBrowsers() {
  for (const browser of activeBrowsers) { try { await browser.close(); } catch (e) {} }
  activeBrowsers.clear();
}

module.exports = { runJob, stopAllBrowsers, takeEvidence };