/*
 ---

 name: ViewportSize

 description: helper method to acquire viewport dimensions.

 provides: [ViewportSize]

 ---
 */

(function () {
  "use strict";

  var JS_GET_VIEWPORT_SIZE = "var height = undefined;"
          + "var width = undefined;"
          + "  if (window.innerHeight) {height = window.innerHeight;}"
          + "  else if (document.documentElement "
          + "&& document.documentElement.clientHeight) "
          + "{height = document.documentElement.clientHeight;}"
          + "  else { var b = document.getElementsByTagName('body')[0]; "
          + "if (b.clientHeight) {height = b.clientHeight;}"
          + "};"
          + " if (window.innerWidth) {width = window.innerWidth;}"
          + " else if (document.documentElement "
          + "&& document.documentElement.clientWidth) "
          + "{width = document.documentElement.clientWidth;}"
          +" else { var b = document.getElementsByTagName('body')[0]; "
          + "if (b.clientWidth) {"
          + "width = b.clientWidth;}"
          + "};"
          + "return {width: width, height: height};",
      ViewportSize = {};

  function _retryCheckViewportSize(driver, size, retries, promiseFactory) {
    return promiseFactory.makePromise(function (resolve, reject) {

      ViewportSize.getViewportSize(driver, promiseFactory).then(function (viewportSize) {
        if (viewportSize.width === size.width && viewportSize.height === size.height) {
          resolve(retries);
          return;
        }

        if (retries === 0) {
          reject(new Error('no more retries to set viewport size'));
          return;
        }

        driver.controlFlow().timeout(1000).then(function () {
          _retryCheckViewportSize(driver, size, retries - 1, promiseFactory).then(function (retriesLeft) {
            resolve(retriesLeft);
          }, function (err) {
            reject(err);
          });
        });
      });
    });
  }

  /**
   *
   * Tries to get the viewport size using Javascript. If fails, gets the entire browser window size!
   *
   * @method getViewportSize
   * @param {Object} driver
   * @param {Object} promiseFactory
   *
   * @return {Object} the size
   *
   **/
  ViewportSize.getViewportSize = function (driver, promiseFactory) {
    return promiseFactory.makePromise(function (resolve) {
      try {
        return driver.executeScript(JS_GET_VIEWPORT_SIZE)
            .then(function (size) {
              if (size.width > 0 && size.height > 0) {
                resolve(size);
                return;
              }
            }, function () {
            });
      } catch (err) {
        driver.manage().window().getSize().then(function (size) {
          resolve(size);
        });
      }
    }.bind(this));
  };


  // TODO: handle the maximize window bug
  ViewportSize.setViewportSize = function (driver, size, promiseFactory) {
    return promiseFactory.makePromise(function (resolve, reject) {
      try {

        driver.manage().window().setPosition(0,0).then(function () {
          ViewportSize.getViewportSize(driver, promiseFactory)
              .then(function (viewPortSize) {
                
                driver.getCapabilities()
                    .then(function(capabilities) {
                      var orientation;
                      if (capabilities.caps_) {
                        orientation = capabilities.caps_.orientation || capabilities.caps_.deviceOrientation;
                      } else {
                        orientation = capabilities.get('orientation') || capabilities.get('deviceOrientation');
                      }
                      if (orientation && orientation.toUpperCase() === 'LANDSCAPE' && size.height > size.width) {
                        var height2 = size.width;
                        size.width = size.height;
                        size.height = height2;
                      }
                      // If the viewport size is already the required size
                      if (size.width == viewPortSize.width &&
                          size.height == viewPortSize.height) {
                        resolve();
                      }
                      driver.manage().window().getSize()
                          .then(function(browserSize){
                            var requiredBrowserSize = {
                              width: browserSize.width + (size.width - viewPortSize.width),
                              height: browserSize.height + (size.height - viewPortSize.height)
                            };
                            driver.manage().window().setSize(requiredBrowserSize.width, requiredBrowserSize.height)
                                .then(function () {
                                  resolve();

                                  _retryCheckViewportSize(driver, size, 3, promiseFactory)
                                      .then(function () {
                                        resolve();
                                      }, function (err) {
                                        reject(err);
                                      });
                                });
                          });
                    })
              }, function (err) {
                reject(err);
              });
        });

      } catch (err) {
        reject(new Error(err));
      }
    }.bind(this));
  };

  module.exports = ViewportSize;
}());
