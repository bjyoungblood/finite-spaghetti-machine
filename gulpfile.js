'use strict';

var gulp     = require('gulp');
var mocha    = require('gulp-mocha');
var istanbul = require('gulp-istanbul');

gulp.task('ci', function (done) {

  process.env.XUNIT_FILE = 'shippable/testresults/tests.xml';

  gulp.src([ 'lib/**/*.js' ])
    .pipe(istanbul({
      includeUntested : true
    }))
    .on('finish', function () {
      gulp.src(['test/**/*.js'])
        .pipe(mocha({
          reporter : require('xunit-file')
        }))
        .pipe(istanbul.writeReports({
          reporters : [ 'cobertura', 'text-summary' ],
          dir : './shippable/codecoverage'
        }));
    });

});
