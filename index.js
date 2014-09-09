exports.Eyes = require('./src/Eyes');
exports.FileLogHandler = require('./src/FileLogHandler');
var EyesSDK = require('eyes.sdk');
exports.ConsoleLogHandler = EyesSDK.ConsoleLogHandler;
exports.NullLogHandler  = EyesSDK.NullLogHandler;
var eyesBase = EyesSDK.EyesBase;
exports.FailureReport = eyesBase.FailureReport;
exports.MatchLevel = eyesBase.MatchLevel;