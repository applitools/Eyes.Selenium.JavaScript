import test from 'ava';
import webdriver from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler} from '../index';

const testName = "Eyes.Selenium.JavaScript - simple";
let driver = null, eyes = null;

test.before(() => {
    driver = new webdriver.Builder()
        .forBrowser('chrome')
        .usingServer('http://localhost:4444/wd/hub')
        .build();

    eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new ConsoleLogHandler(true));
});

test('GitHub simple', t => {
    return eyes.open(driver, testName, t.title, {width: 800, height: 560}).then(function (driver) {
        eyes.addProperty("MyProp", "I'm correct!");
        driver.get('https://github.com');

        eyes.checkWindow("github");
        eyes.checkRegionByElement(driver.findElement(webdriver.By.css('form.home-hero-signup button')), 'signup section');

        return eyes.close();
    }).catch(function (err) {
        t.fail(err.message);
    });
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
