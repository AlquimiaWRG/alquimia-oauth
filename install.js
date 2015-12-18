"use strict";

module.exports = function(done) {
  var fs = require('fs');

  fs.mkdirSync('app/src/oauth');
      alquimia.copy(__dirname + '/assets/oauth', 'app/src/oauth');

  done();
};
