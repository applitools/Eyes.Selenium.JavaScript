"use strict";

var webdriver = require('selenium-webdriver');

var driver = new webdriver.Builder().
    withCapabilities(webdriver.Capabilities.chrome()).build();

var Eyes = require('./../index').Eyes;
var eyes = new Eyes('https://eyesapi.applitools.com');
eyes.setApiKey(process.env.APPLITOOLS_API_KEY);

var LogHandler = require('../index').ConsoleLogHandler;
var TestResultsFormatter = require('../index').TestResultsFormatter;
var resultsFormatter = new TestResultsFormatter();

eyes.setLogHandler(new LogHandler(true));
eyes.open(driver, "JavaScript SDK", "JS Selenium SDK Test - github - 106", {width: 800, height: 560}).then(function (driver) {
    driver.get('https://github.com');
    eyes.checkWindow("github");
    eyes.checkRegionByElement(driver.findElement(webdriver.By.className('btn-primary')), 'signup section');
    return eyes.close(false);
}).then(function (results) {
    console.log("then results: ", results);
    resultsFormatter.addResults(results);
    driver.quit();
}, function (err) {
    console.error("error results: ", err);
    resultsFormatter.addResults(err.results);
    driver.quit();
    eyes.abortIfNotClosed();
}).then(function () {
    console.log(resultsFormatter.asHierarchicTAׁPString());
});
