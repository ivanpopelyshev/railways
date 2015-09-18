var gulp    = require('gulp'),
    bundle  = require('../util/bundle-ui');

gulp.task('scripts2', function () {
    return bundle();
});