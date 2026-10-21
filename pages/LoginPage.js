class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginBtn = page.locator('button[type="submit"]');
  }

  async login(username, password) {
    await this.page.goto(process.env.STAGE_URL);
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginBtn.click();
    await this.page.waitForSelector('.oxd-topbar-header-breadcrumb');
  }
}
module.exports = { LoginPage };