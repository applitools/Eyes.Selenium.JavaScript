var webdriver = require('selenium-webdriver');

var driver = new webdriver.Builder().
    withCapabilities(webdriver.Capabilities.chrome()).
    build();

var Eyes = require('./../src/Eyes');
Eyes.setApiKey("");
var eyes = new Eyes();

console.log('Starting test');
eyes.open(driver, "JavaScript SDK", "Simple JS SDK Test").then(function(driver2) {
    console.log('Eyes opened - scheduling getting google');
    driver2.get('http://www.google.com');
    console.log('Scheduling check window for google');
    eyes.checkWindow("Google");
    console.log('Scheduling getting NBA');
    driver2.get('http://www.nba.com');
    console.log('Scheduling check window for nba');
    eyes.checkWindow("NBA");
    console.log('Scheduling eyes close');
    eyes.close(true);
    driver2.quit();
});

