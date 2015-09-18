var gulp    = require('gulp'),
    path    = require('path'),
    gutil   = require('gulp-util'),
    bundle  = require('../util/bundle');

gulp.task('watch', function () {
    gulp.watch(paths.scripts, ['scripts', 'scripts2'])
        .on('change', logChanges);

    gulp.watch(paths.src_styles + '/*.less', ['styles'])
        .on('change', logChanges);

    return bundle.watch();
});

function logChanges(event) {
    gutil.log(
        gutil.colors.green('File ' + event.type + ': ') +
        gutil.colors.magenta(path.basename(event.path))
    );
}
