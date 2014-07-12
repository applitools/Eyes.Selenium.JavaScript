var webdriver = require('selenium-webdriver');

var driver = new webdriver.Builder().
   withCapabilities(webdriver.Capabilities.chrome()).
   build();

var Eyes = require('./../src/Eyes');
Eyes.setApiKey("fy11O5GelVm856YF4q5vlF50AnuRiY5301y1Kj0LjTk110");
var eyes = new Eyes();

eyes.open(driver, "appNameasda", "testNamesdasda").then(function(driver2) {
    driver2.get('http://www.google.com').then(function () {
        eyes.checkWindow("ttaagg").then(function (){
            driver2.get('http://www.nba.com').then(function () {
                eyes.checkWindow("ttaagg222").then(function () {
                    eyes.close(true).then(function () {
                        driver2.quit();
                    });
                });
            });
        });
    });
});

