// const { chromium } = require('playwright');
// const fs = require('fs');
// const path = require('path');

// async function takeEvidence(page, selector, actionName, jobId) {
//   const evidenceDir = path.join(__dirname, 'evidence', jobId);
//   fs.mkdirSync(evidenceDir, { recursive: true });

//   const locator = page.locator(selector);
//   await locator.waitFor({ state: 'visible' });

//   await locator.evaluate((el) => {
//     el.style.outline = '4px solid red';
//     el.style.boxShadow = '0 0 10px red';
//   });

//   const screenshotPath = path.join(evidenceDir, `${actionName}.png`);
//   await page.screenshot({ path: screenshotPath, fullPage: true });

//   await locator.evaluate((el) => {
//     el.style.outline = '';
//     el.style.boxShadow = '';
//   });
  
//   console.log(`Saved evidence: ${screenshotPath}`);
// }


// async function runJob(rowData, jobId) {
//   const browser = await chromium.launch({ headless: false });
//   const context = await browser.newContext();
//   const page = await context.newPage();



//   async function runJob(rowData, jobId) {
//   const browser = await chromium.launch({ headless: false });
//   const context = await browser.newContext();
//   const page = await context.newPage();

  
// }

//   try {
//     await page.goto('https://demoqa.com/text-box');
//     await page.waitForTimeout(500);

//     const inputSelector = '#userName';
//     const testName = rowData?.ProjectName || 'Automated Test User';
    
//     await page.fill(inputSelector, testName);
//     await takeEvidence(page, inputSelector, '01_Fill_Input', jobId);

//     const buttonSelector = '#submit';
//     await takeEvidence(page, buttonSelector, '02_Before_Click_Submit', jobId);
    
//     await page.click(buttonSelector);
//     await page.waitForTimeout(1000); 

//     return { status: 'Passed', message: 'Form submitted successfully' };
//   } catch (error) {
//     console.error(`Error during Job ${jobId}:`, error);
//     return { status: 'Failed', message: error.message };
//   } finally {
//     await browser.close();
//   }
// }

// module.exports = { runJob };

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function takeEvidence(page, selector, actionName, jobId) {
  // Note: jobId is now "Job_1", so the folder will be named "Job_1" (not "Job_Job_1")
  const evidenceDir = path.join(__dirname, 'evidence', jobId);
  fs.mkdirSync(evidenceDir, { recursive: true });

  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible' });

  await locator.evaluate((el) => {
    el.style.outline = '4px solid red';
    el.style.boxShadow = '0 0 10px red';
  });

  const screenshotPath = path.join(evidenceDir, `${actionName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await locator.evaluate((el) => {
    el.style.outline = '';
    el.style.boxShadow = '';
  });
  
  console.log(`Saved evidence: ${screenshotPath}`);
}

async function runJob(rowData, jobId) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://demoqa.com/text-box');
    await page.waitForTimeout(500);

    const inputSelector = '#userName';
    const testName = rowData?.ProjectName || 'Automated Test User';
    
    await page.fill(inputSelector, testName);
    
    // 1. Take the first screenshot
    await takeEvidence(page, inputSelector, '01_Fill_Input', jobId);

    // --- FAILURE TRAP ---
    // If the row name is exactly "FAIL_JOB", we force an error
    if (testName === 'FAIL_JOB') {
      await page.click('#this-button-does-not-exist', { timeout: 2000 });
    }
    // --------------------

    const buttonSelector = '#submit';
    
    // 2. Take the second screenshot
    await takeEvidence(page, buttonSelector, '02_Before_Click_Submit', jobId);
    
    await page.click(buttonSelector);
    await page.waitForTimeout(1000); 

    return { status: 'Passed', message: 'Form submitted successfully' };
  } catch (error) {
    console.error(`Error during Job ${jobId}:`, error.message);
    return { status: 'Failed', message: error.message };
  } finally {
    await browser.close();
  }
}

module.exports = { runJob };