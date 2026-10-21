class AddEmployeePage {
  constructor(page) {
    this.page = page;
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.saveBtn = page.locator('button[type="submit"]');
  }

  async fillForm(firstName, lastName) {
    await this.firstNameInput.waitFor({ state: 'visible' });
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
  }

  async clickSave() {
    await this.saveBtn.click();
  }
}
module.exports = { AddEmployeePage };