var path = require("path");
var log4js = require("log4js");
var HTTP_LOG_FORMAT_DEV = ':method :url :status :response-time ms - :res[content-length]';

exports.configure = function(mode) {
  if (mode === "master") {
    log4js.configure(path.join(__dirname, "./log4js-master.json"));
  } else {
    log4js.configure(path.join(__dirname, "./log4js-worker.json"));
  }
}


exports.logger = function(name) {
  var dateFileLog = log4js.getLogger(name);
  dateFileLog.setLevel(log4js.levels.INFO);
  return dateFileLog;
}

exports.useLog = function() {
  return log4js.connectLogger(log4js.getLogger("normal"), {level: log4js.levels.INFO});
}