"use strict";

module.exports = function(done) {
  alquimia.del(alquimia.getPath('appDir') + '/' + alquimia.getPath('scriptsDir') + '/oauth');
  done();
};
