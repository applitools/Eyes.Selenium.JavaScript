'use strict';

var webdriver = require('selenium-webdriver');
var EyesSDK = require('../index');
var assert = require('assert');

var driver, eyes;
describe('Eyes', function () {

    this.timeout(5 * 60 * 1000);

    before(function () {
        driver = new webdriver.Builder()
            .forBrowser('chrome')
            .build();

        eyes = new EyesSDK.Eyes();
        eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
        eyes._promiseFactory.setFactoryMethods(function (asyncAction) {
            return new Promise(asyncAction);
        }, undefined);
    });

    describe('#open()', function () {
        it('should return EyesWebDriver', function () {
            return eyes.open(driver, this.test.parent.title, this.test.title, {
                width: 800,
                height: 560
            }).then(function (driver) {
                assert.equal(driver instanceof EyesSDK.EyesWebDriver, true);
                return eyes.close();
            });
        });

        it('should throw IllegalState: Eyes not open', function () {
            return eyes.check('test', EyesSDK.Target.window()).catch(function (error) {
                assert.equal(error.message, 'checkWindow called with Eyes not open');
            });
        });
    });

    describe('#WebDriver', function () {
        it('type should be return thenableWebDriverProxy', function () {
            assert.equal(driver.constructor.name, "thenableWebDriverProxy");

            return eyes._promiseFactory.resolve(driver).then(function (value) {
                assert.equal(value.constructor.name, "Driver");
            });
        });

        it('type should be return EyesWebDriver', function () {
            var eyesDriver = new EyesSDK.EyesWebDriver(driver, eyes, eyes._logger);
            assert.equal(eyesDriver.constructor.name, "EyesWebDriver");

            return eyes._promiseFactory.resolve(eyesDriver).then(function (value) {
                assert.equal(value.constructor.name, "EyesWebDriver");
            });
        });
    });

    describe('#WebElement', function () {
        var eyesDriver;
        before(function () {
            return eyes.open(driver, this.test.parent.title, this.test.title, {
                width: 800,
                height: 560
            }).then(function (driver) {
                eyesDriver = driver;
            });
        });

        after(function () {
            return eyes.close();
        });

        it('type should be return WebElement', function () {
            driver.get('https://astappev.github.io/test-html-pages/');

            var element = driver.findElement(webdriver.By.css("body > h1"));
            return element.then(function (value) {
                assert.equal(value.constructor.name, "WebElement");
            })
        });

        it('type should be return WebElement (due to WebElementPromise)', function () {
            eyesDriver.get('https://astappev.github.io/test-html-pages/');

            var element = eyesDriver.findElementByCssSelector("body > h1");
            return element.then(function (value) {
                assert.equal(value.constructor.name, "WebElement");
            })
        });
    });

    after(function () {
        return driver.quit().then(function (value) {
            return eyes.abortIfNotClosed();
        });
    });
});
