import test from 'ava';
import webdriver from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler, TestResultsFormatter} from '../index';

let driver = null, eyes = null, resultsFormatter = null;

test.before(() => {
    driver = new webdriver.Builder()
        .forBrowser('chrome')
        .usingServer('http://localhost:4444/wd/hub')
        .build();

    eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new ConsoleLogHandler(true));
    eyes.addProperty("propertyName1", "propValue1");
    eyes.addProperty("propertyName2", "propValue2");
    eyes.addProperty("propertyName3", "propValue3");
    eyes.addProperty("propertyName4", "propValue4");
    resultsFormatter = new TestResultsFormatter();
});

test('Simple Test - GitHub', t => {
    return eyes.open(driver, "Eyes Selenium SDK - simple", t.title, {width: 800, height: 560}).then(function (driver) {
        driver.get('https://github.com');

        eyes.checkWindow("github");
        eyes.checkRegionByElement(driver.findElement(webdriver.By.className('btn btn-orange')), 'signup section');

        return eyes.close();
    }).catch(function (err) {
        t.fail(err.message);
        return err.results;
    }).then(function (results) {
        resultsFormatter.addResults(results);
        console.log(resultsFormatter.asHierarchicTAׁPString());
    });
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
