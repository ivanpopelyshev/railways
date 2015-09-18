/**
 * Created by Liza on 13.08.2015.
 */

module.exports = function($rootScope, game) {
    return {
        restrict: 'AE',
        transclude: true,
        templateUrl: 'tmpl/viewport.html',
        //template: '<div class="viewport"></div><div class="uiport" ng-show="!game_active" ng-transclude></div><div ui-view="view-msg" class="message-box" ng-controller="TipsCtrl"><div ng-include="'tmpl/includes/'+current_tip +'.tip.html'" scope="" onload="" ng-if="is_opened"></div></div>',
        link: function( scope, elem, attrs ) {

            scope.$on("containerResize", function(event) {
                //update html rem 
                var viewport_wrapper = angular.element('.viewport');
                var new_rem = Math.floor(10* (viewport_wrapper.width()/1200));
                //console.log(new_rem);
                angular.element('html').css('font-size', new_rem + 'px');
            });

            scope.$emit("containerResize");

            game.bind(elem.children('.viewport')[0], $rootScope.options);
            scope.$on("$destroy", function () {
                game.unbind();
            });
        }
    }
};
