/**
 * Created by Liza on 13.08.2015.
 */

module.exports = function($rootScope, game) {
    //game.start($rootScope.options);
    return {
        restrict: 'AE',
        transclude: true,
        template: '<div class="uimain" ng-show="!game_active"><ng-transclude></ng-transclude></div>',
        //templateUrl: 'tmpl/start.html',
        link: function( scope, elem, attrs ) {
            
        }
    }
};
