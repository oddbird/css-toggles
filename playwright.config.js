export default {
  timeout: process.env.CI ? undefined : 10 * 1000, // Max execution time of any single test
  expect: {
    timeout: 1000, // Max execution time of single expect() calls
  },
  webServer: {
    command: 'PORT=4000 LEVEL=warning yarn preview',
    port: 4000,
    timeout: process.env.CI ? 60 * 1000 : 10 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:4000/',
    browserName: 'chromium',
    headless: true,
    forbidOnly: process.env.CI,
  },
}
