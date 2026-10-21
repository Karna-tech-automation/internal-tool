const { expect } = require('@playwright/test'); 
const { LoginPage } = require('../pages/LoginPage');
const { ProjectPage } = require('../pages/ProjectPage');
const { takeEvidence } = require('../utils/helpers');

async function runCreateProject(page, rowData, jobId) {
  const loginPage = new LoginPage(page);
  const projectPage = new ProjectPage(page);

  // 1. Login
  await loginPage.login(process.env.STAGE_USERNAME, process.env.STAGE_PASSWORD);

  // 2. Execute manual steps from Excel
  await projectPage.createProject(rowData.ProjectName, rowData.Office);
  
  // 3. Take Evidence
  await takeEvidence(page, '.project-number-display', '01_Project_Transmitted', jobId);

  // 4. Extract Data from UI
  const extractedProjectNumber = await projectPage.extractProjectDetails();
  const extractedJobName = await page.title(); // Example: getting job name from page title

  // 5. Assertions
  expect(extractedProjectNumber).not.toBeNull();
  expect(extractedProjectNumber.length).toBeGreaterThan(5);

  // 6. Return data back to the Node.js Server
  return {
    status: 'Passed',
    message: 'Project created successfully',
    extractedData: {
      projectNumber: extractedProjectNumber,
      jobName: extractedJobName
    }
  };
}

module.exports = { runCreateProject };