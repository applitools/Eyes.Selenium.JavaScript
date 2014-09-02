eyes.selenium
=============

Applitools Eyes SDK For Selenium JavaScript WebDriver


Getting Started
---------------
Install eyes.selenium as a local dev dependency in your tested project:

    npm install eyes.selenium

Add Eyes to your tests, for example - when directly using selenium-webdriver:
```javascript
var webdriver = require('selenium-webdriver');

var driver = new webdriver.Builder().
    withCapabilities(webdriver.Capabilities.chrome()).
    build();

var Eyes = require('eyes.selenium').Eyes;
var eyes = new Eyes();
eyes.setApiKey("<YOUR_API_KEY>");

eyes.open(driver, "JavaScript SDK", "Simple JS SDK Test").then(function(driver) {
    driver.get('http://www.google.com');
    eyes.checkWindow("Google");
    driver.get('http://www.nba.com');
    eyes.checkWindow("NBA");
    eyes.close();
    driver.quit();
});
```
