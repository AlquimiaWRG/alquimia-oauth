"use strict";

module.exports = function(defaultJs) {
  defaultJs.getElement('angular').push('angular-cookies');
  defaultJs.getElement('alquimia').oauth = true;
  return defaultJs;
};
