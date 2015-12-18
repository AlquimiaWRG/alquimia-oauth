"use strict";

module.exports = function(defaultJs) {
  defaultJs.getElement('angular').push('angular-cookies', './oauth');
  return defaultJs;
};
