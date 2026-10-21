class ProjectPage {
  constructor(page) {
    this.page = page;
    this.projectNameInput = page.locator('input[name="firstName"]'); // Example locator
    this.transmitBtn = page.locator('button[type="submit"]');
    this.projectNumberText = page.locator('.project-number-display'); // Example locator
  }

  async createProject(projectName, officeLocation) {
    await this.projectNameInput.fill(projectName);
    // ... other complex steps ...
    await this.transmitBtn.click();
  }

  async extractProjectDetails() {
    await this.page.waitForSelector('.project-number-display');
    const projectNum = await this.projectNumberText.innerText();
    return projectNum.trim();
  }
}
module.exports = { ProjectPage };