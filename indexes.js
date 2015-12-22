"use strict";

module.exports = function(defaults) {
  defaults.getElement('angular').push('angular-cookies', './oauth');
  return defaults;
};
