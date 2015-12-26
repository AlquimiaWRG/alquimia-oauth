"use strict";

module.exports = function(done) {
  var fs = require('fs');
  var appDir = alquimia.getPath('appDir');
  var scriptsDir = alquimia.getPath('scriptsDir');

  fs.mkdirSync(appDir + '/' + scriptsDir + '/oauth');
  alquimia.copy(__dirname + '/assets/oauth', appDir + '/' + scriptsDir + '/oauth');

  done();
};
