import test from 'ava';
import {Builder as WebDriverBuilder} from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler, FixedCutProvider} from '../index';

const appName = "Eyes.Selenium.JavaScript - simple";
let driver = null, eyes = null;

test.before(() => {
    driver = new WebDriverBuilder()
        .forBrowser('chrome')
        .usingServer('http://localhost:4444/wd/hub')
        .build();

    eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new ConsoleLogHandler(true));
});

test.beforeEach(t => {
    const testName = t.title.replace("beforeEach for ", "");
    return eyes.open(driver, appName, testName, {width: 800, height: 560}).then(function (browser) {
        driver = browser;
    });
});

test("Simple methods on TestHtmlPages", () => {
    driver.get('https://astappev.github.io/test-html-pages/');

    eyes.addProperty("MyProp", "I'm correct!");

    eyes.checkWindow("Entire window");

    // cut params: header, footer, left, right.
    eyes.setImageCut(new FixedCutProvider(60, 100, 50, 120));

    eyes.checkWindow("Entire window with cut borders");

    return eyes.close();
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
