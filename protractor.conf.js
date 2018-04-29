// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

exports.config = {
    seleniumAddress: 'http://localhost:4444/wd/hub',
    specs: [
        './test/protractor/**/*.js'
    ],
    capabilities: {
        browserName: 'chrome'
    },
    restartBrowserBetweenTests: true,
    framework: 'jasmine2',
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 300000
    },
    onPrepare: function() {
        // we need this to get appName and testName and pass them to eyes.open in beforeEach
        jasmine.getEnv().addReporter({
            specStarted: function(result) {
                global.testName = result.description;
                global.appName = result.fullName.replace(" " + testName, "");
            }
        });
    },
};