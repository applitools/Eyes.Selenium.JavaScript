var Eyes = require('../index').Eyes;
var ConsoleLogHandler = require('../index').ConsoleLogHandler;
var StitchMode = require('../index').StitchMode;
var Target = require('../index').Target;
var MatchLevel = require('../index').MatchLevel;

var eyes;

describe("Eyes.Selenium.JavaScript - check-interface", function() {

    beforeAll(function(){
        eyes = new Eyes();
        eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
        eyes.setLogHandler(new ConsoleLogHandler(true));
        eyes.setStitchMode(StitchMode.CSS);
        eyes.setForceFullPageScreenshot(true);
    });

    beforeEach(function(done){
        eyes.open(browser, global.appName, global.testName, {width: 1000, height: 700}).then(function () {
            done();
        });
    });

    it("TestHtmlPages using check interface", function(done) {
        browser.get('https://astappev.github.io/test-html-pages/');

        // Entire window
        eyes.check("Entire window", Target.window()
                .matchLevel(MatchLevel.Layout)
                .ignore(by.id("overflowing-div"))
                .ignore({element: element(by.name("frame1"))})
                .ignore({left: 400, top: 100, width: 50, height: 50}, {left: 400, top: 200, width: 50, height: 100})
                .floating({left: 500, top: 100, width: 75, height: 100, maxLeftOffset: 25, maxRightOffset: 10, maxUpOffset: 30, maxDownOffset: 15})
                .floating({element: by.id("overflowing-div-image"), maxLeftOffset: 5, maxRightOffset: 25, maxUpOffset: 10, maxDownOffset: 25})
            // .floating({element: element(by.tagName("h1")), maxLeftOffset: 10, maxRightOffset: 10, maxUpOffset: 10, maxDownOffset: 10})
        );

        // Region by rect
        eyes.check("Region by rect", Target.region({left: 50, top: 50, width: 200, height: 200})
            // .floating({left: 50, top: 50, width: 60, height: 50, maxLeftOffset: 10, maxRightOffset: 10, maxUpOffset: 10, maxDownOffset: 10})
            // .floating({left: 150, top: 75, width: 60, height: 50, maxLeftOffset: 10, maxRightOffset: 10, maxUpOffset: 10, maxDownOffset: 10})
        );

        // Region by element
        eyes.check("Region by element", Target.region(element(by.id("overflowing-div"))));

        // Entire content of element
        eyes.check("Entire element", Target.region(by.id("overflowing-div")).fully().matchLevel(MatchLevel.Exact));

        // Entire region in frame
        eyes.check("Entire region in frame", Target.region(by.id("inner-frame-div"), "frame1").fully());

        // Entire frame content
        eyes.check("Entire frame", Target.frame("frame1").matchLevel(MatchLevel.None));

        eyes.close().then(function () {
            done();
        });
    });

    afterEach(function(done) {
        eyes.abortIfNotClosed().then(function () {
            done();
        });
    });
});
