var gulp    = require('gulp'),
    bundle  = require('../util/bundle-worker');

gulp.task('scripts2', function () {
    return bundle();
});
