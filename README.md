eyes.selenium
=============

Applitools Eyes SDK For Selenium JavaScript WebDriver
[![Build Status](https://travis-ci.org/applitools/Eyes.Selenium.JavaScript.svg?branch=master)](https://travis-ci.org/applitools/Eyes.Selenium.JavaScript)


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

Using Protractor
---------------
Eyes.Selenium.JavaScript also allow you to use Protractor in your tests.
First you have to install Protractor dependencies:

    npm install -g selenium-webdriver protractor

Then you can use next example:
```javascript
var Eyes = require('eyes.selenium').Eyes;
var eyes = new Eyes();
eyes.setApiKey("<YOUR_API_KEY>");

describe('angularjs homepage', function() {
    it('should add one and two', function() {
        eyes.open(browser, "JavaScript SDK", "Simple Protractor Test");
        browser.get('http://juliemr.github.io/protractor-demo/');
        eyes.checkWindow("Demo start");
        element(by.model('first')).sendKeys(1);
        element(by.model('second')).sendKeys(2);
        eyes.checkWindow("Input Ready");
        element(by.id('gobutton')).click();
        eyes.checkWindow("Result");

        expect(element(by.binding('latest')).getText()).toEqual('3');

        eyes.close();
    });
});
```

For more details, please, see [Protractor documentation](http://protractortest.org).

Note: older Protractor versions may require passing ```protractor.getInstance().driver``` instead of ```browser``` to ```eyes.open()```
