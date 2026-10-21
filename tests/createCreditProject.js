const { AddEmployeePage } = require('../pages/AddEmployeePage');
const fs = require('fs');
const path = require('path');

// This is the function our automation.js router calls
async function runCreateCreditProject(page, rowData, jobId) {
  console.log(`[${jobId}] Running Custom JS Test for ${rowData.ProjectName}`);

  // 1. Login
  await page.goto(process.env.STAGE_URL);
  await page.fill('input[name="username"]', process.env.STAGE_USERNAME);
  await page.fill('input[name="password"]', process.env.STAGE_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.oxd-topbar-header-breadcrumb');

  // 2. Navigate to Add Employee
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/pim/addEmployee');
  
  // 3. Use our Page Object to fill the form
  const employeePage = new AddEmployeePage(page);
  await employeePage.fillForm(rowData.ProjectName, rowData.Office);
  
  // 4. Take Screenshot manually
  const evidenceDir = path.join(__dirname, '..', 'evidence', jobId);
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, '01_Custom_Test_Evidence.png'), fullPage: true });

  // 5. Click Save
  await employeePage.clickSave();
  await page.waitForTimeout(2000);

  // 6. FAKE EXTRACTION: Let's pretend we scraped a Project ID from the page
  const fakeProjectNumber = `PRJ-${Math.floor(Math.random() * 9000) + 1000}`;
  const pageTitle = await page.title();

  // 7. Return the results back to the Node Server
  return {
    status: 'Passed',
    message: `Custom Test passed for ${rowData.ProjectName}`,
    extractedData: {
      projectNumber: fakeProjectNumber,
      jobName: pageTitle
    }
  };
}

module.exports = { runCreateCreditProject };