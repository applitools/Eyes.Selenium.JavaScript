/*
 ---

 name: FileLogHandler

 description: Write log massages to the browser/node console

 provides: [FileLogHandler]
 requires: [winston]

 ---
 */

(function () {
  "use strict";

  var winston = require('winston'),
    timeStringFn = require('eyes.sdk').ConsoleLogHandler.getTimeString;

  /**
   *
   * C'tor = initializes the module settings
   *
   * @param {Boolean} isVerbose
   *
   **/
  function FileLogHandler(isVerbose) {
    this._isVerbose = !!isVerbose;
    this._appendToFile = true;
    this._fileName = "eyes.log";
    this._fileDirectory = "./";
  }

  /**
   * Whether to handle or ignore verbose log messages.
   *
   * @param {Boolean} isVerbose
   */
  FileLogHandler.prototype.setIsVerbose = function (isVerbose) {
    this._isVerbose = !!isVerbose;
  };

  /**
   * Whether to handle or ignore verbose log messages.
   *
   * @return {Boolean} isVerbose
   */
  FileLogHandler.prototype.getIsVerbose = function () {
    return this._isVerbose;
  };

  /**
   * Whether to append messages to the log file or to reset it on open.
   *
   * @param {Boolean} shouldAppend
   */
//    FileLogHandler.prototype.setAppendToFile = function (shouldAppend) {
//        this._appendToFile = !!shouldAppend;
//    };

  /**
   * Whether to append messages to the log file or to reset it on open.
   *
   * @return {Boolean}
   */
//    FileLogHandler.prototype.getAppendToFile = function () {
//        return this._appendToFile;
//    };

  /**
   * The name of the log file.
   *
   * @param {String} fileName
   */
  FileLogHandler.prototype.setFileName = function (fileName) {
    this._fileName = fileName;
  };

  /**
   * The name of the log file.
   *
   * @return {String} the file name
   */
  FileLogHandler.prototype.getFileName = function () {
    return this._fileName;
  };

  /**
   * The path of the log file folder.
   *
   * @param {String} fileDirectory
   */
  FileLogHandler.prototype.setFileDirectory = function (fileDirectory) {
    this._fileDirectory = fileDirectory;
  };

  /**
   * The path of the log file folder.
   *
   * @return {String} the file Directory
   */
  FileLogHandler.prototype.getFileDirectory = function () {
    return this._fileDirectory;
  };

  FileLogHandler.prototype.open = function () {
    this.close();
    this._logger = new (winston.Logger)({
      exitOnError: false,
      transports: [
        new (winston.transports.File)({
          filename: this._fileName,
          dirname: this._fileDirectory,
          timestamp: timeStringFn,
          json: false
        })
      ]
    });
  };

  FileLogHandler.prototype.close = function () {
    if (this._logger) {
      this._logger.close();
      this._logger = undefined;
    }
  };

  /**
   * Write a message
   * @param {Boolean} verbose - is the message verbose
   * @param {String} message
   */
  FileLogHandler.prototype.onMessage = function (verbose, message) {
    if (!verbose || this._isVerbose) {
      this._logger.info("Eyes: " + message);
    }
  };

  module.exports = FileLogHandler;
}());
