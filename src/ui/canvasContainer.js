/**
 * Created by Liza on 13.08.2015.
 */

module.exports = function ($rootScope) {
    return {
        restrict: 'AE',
        transclude: true,
        template: '<div class="inner-container" ng-transclude></div>',
        link: function( scope, elem, attrs ) {
            var w0 = +attrs['canvasWidth'] || 1200;
            var h0 = +attrs['canvasHeight'] || 720;

            var outer = elem[0];
            outer.classList.add("outer-container");
            var inner = elem.children(".inner-container")[0];

            var w1=0, h1=0;

            function resize() {
                var ww = outer.clientWidth, hh = outer.clientHeight;
                var ratio = Math.min(1, Math.min(ww / w0, hh / h0));
                w1 = Math.ceil(ratio * w0); h1 = Math.ceil(ratio * h0);
                $rootScope.dimensions = { width: w1, height: h1};
                inner.style.width = w1 + "px";
                inner.style.height = h1 + "px";
                inner.style.left = Math.floor((ww-w1)/2) + "px";
                inner.style.top = Math.floor((hh-h1)/2) + "px";
            }

            function resize2() {
                var w_old = w1, h_old = h1;
                resize();
                //hand-written watch
                if (w_old != w1 || h_old != h1)
                    scope.$broadcast("containerResize", { width: w1, height: h1 });
            }

            resize2();
            window.addEventListener('resize', resize2);
            scope.$on("$destroy", function() {
                window.removeEventListener('resize', resize2);
            });
        }
    }
}
