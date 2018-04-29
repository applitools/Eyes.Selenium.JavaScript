require('chromedriver');

var webdriver = require('selenium-webdriver');
var Capabilities = webdriver.Capabilities;
var Builder = webdriver.Builder;
var By = webdriver.By;

var SeleniumSDK = require('../index'); // should be replaced to 'eyes.selenium'
var Eyes = SeleniumSDK.Eyes;
var ConsoleLogHandler = SeleniumSDK.ConsoleLogHandler;

// Open a Chrome browser.
var driver = new Builder()
    .withCapabilities(Capabilities.chrome())
    .build();

// Initialize the eyes SDK and set your private API key.
var eyes = new Eyes();
// eyes.setApiKey('YOUR_API_KEY'); // Set APPLITOOLS_API_KEY env variable or uncomment and update this line
eyes.setLogHandler(new ConsoleLogHandler(false));

try {
    // Start the test and set the browser's viewport size to 800x600.
    eyes.open(driver, 'Hello World!', 'My first Javascript test!', {width: 800, height: 600});

    // Navigate the browser to the "hello world!" web-site.
    driver.get('https://applitools.com/helloworld');

    // Visual checkpoint #1.
    eyes.checkWindow('Main Page');

    // Click the "Click me!" button.
    driver.findElement(By.css('button')).click();

    // Visual checkpoint #2.
    eyes.checkWindow('Click!');

    // End the test.
    eyes.close();
} finally {
    // Close the browser.
    driver.quit();

    // If the test was aborted before eyes.close was called ends the test as aborted.
    eyes.abortIfNotClosed();
}
