var gulp = require('gulp');
var less = require('gulp-less');

gulp.task('styles', function () {
    //return bundle();
    return gulp.src(paths.lessEntry)
    .pipe(less())
   	.pipe(gulp.dest(paths.out_styles));
});
 
gulp.task('styles:watch', function () {
  gulp.watch( paths.styles, ['styles'] );
});