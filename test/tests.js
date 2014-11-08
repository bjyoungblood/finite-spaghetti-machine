'use strict';

require('blanket')({
  pattern : function(filename) {
    return !/node_modules/.test(filename) && !/.spec.js/.test(filename);
  }
});
