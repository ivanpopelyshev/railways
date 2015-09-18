/**
 * Created by Liza on 13.08.2015.
 */

var app = window.app = angular.module('app', ['ui.router',
  require('./directives/modal'), require('./directives/pagination')]);

app.config(function($stateProvider, $urlRouterProvider) {


 $urlRouterProvider.otherwise("");

  $stateProvider
    .state('main', {
      url: "",
      views: {
        "view-main": { templateUrl: "tmpl/start.html" },
        "view-msg": { template: "" }
      },
      controller: "MainUiCtrl"
    })
    .state('game', {
      url: "/game",
      views: {
        "view-main": { templateUrl: "tmpl/game.html" },
        "view-msg": { template: "" }
      },
      controller: "GameCtrl"
    })
    .state('rules', {
      url: "/rules",
      views: {
        "view-main": { templateUrl: "tmpl/rules.html" },
        "view-msg": { template: "" }
      },
      controller: "RulesCtrl"
    })
    .state('rating', {
      url: "/rating",
      views: {
        "view-main": { templateUrl: "tmpl/rating.html" },
        "view-msg": { template: "" }
      },
      controller: "RatingCtrl"
    })

});

app.run(function($rootScope, $state, $modal, $q) {

	$rootScope.game_active = 0;
	$state.go('main');
	console.log('state', $state.get())

  $rootScope.open_tip = function(type_name){

      //console.log('Has To Open TIP');
      $rootScope.$emit('open_tip', {tip: type_name});

      return $q(function(resolve, reject) {

          $rootScope.$on('close_tip', function(tip_name){
              resolve({tip: tip_name});
          })
          setTimeout(function() {
              reject({tip: tip_name});
          }, 1000000);

        });

      /* var tipModal = $modal.open({
        backdrop: false,
        templateUrl: 'tmpl/includes/' +  type_name + '.tip.html',
        controller: 'SingleTipCtrl',
        //windowTemplateUrl: 'tmpl/includes/' +    type_name + '.tip.html',

        resolve: {
          tip_opened: true
        }

      });


      tipModal.result.then(function (closedTip) {
        $scope.closed = closedTip;
      }, function () {
        $log.info('Modal dismissed at: ' + new Date());
      }); */

  }

    $rootScope.isFullscreen = function() {
        if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement) return true;
        return false;
    }

    $rootScope.setFullscreen = function(value) {
        var fs = $rootScope.isFullscreen();
        if (fs != value) {
            if (fs) {
                if (document.cancelFullScreen) {
                    document.cancelFullScreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                }
            } else {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (document.documentElement.mozRequestFullScreen) {
                    document.documentElement.mozRequestFullScreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                }
            }
        }
    }

  $rootScope.toggleFullscreen = function(){
      $rootScope.setFullscreen(!$rootScope.isFullscreen());
  }

});


app.service('storage', require('../game/storage'));
app.service('resources', require('../game/resources'));
app.service('game', require('../game'));
require('./params')(app);
app.service('stats', function($rootScope) {
    if ($rootScope.options.stats != 1)  return { begin: function(){}, end: function(){} };
    var Stats = require('stats-js');
    stats = new Stats();
    //stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
    return stats;
});
app.service('tracker', require('./tracker'));

app.directive('canvasContainer', require('./canvasContainer'));
app.directive('viewport', require('./viewport'));
app.directive('ui', require('./ui'));



app.controller('MainUiCtrl', ['$scope', '$rootScope', function($scope, $rootScope){

	console.log('Root Ui Ctrl');

}])


app.controller('RatingCtrl', ['$scope', '$rootScope', '$http', function($scope, $rootScope, $http){

    var allPlaces = [];
    $scope.active_page = 1;
    $scope.last_page = 7;
    $scope.center_page = 3;

    for( var i=0;i<50;i++) {
        allPlaces.push({ place: (i+1), nickname: "player"+i, score: 1000 * (50-i)});
    }

    function ask(url, query) {
        return { success: function(cb) {
            cb({from: query.from, size:query.size, total: allPlaces.length, list: allPlaces.slice(query.from, query.from+query.size)});

            }
        };
    }

    ask = function(url, param) {
        return $http.get(url+"?from="+param.from+"&size="+param.size);
    }
    $scope.places = [];
    //was http url
    ask('api/rating', {from: 0, size: 10}).success(function(data) {

        $scope.places = data.list;
        $scope.total = data.total;
        $scope.last_page = Math.ceil($scope.total/10);

    })


    $scope.load_page = function(page_number){
      page_number = parseInt(page_number);
      ask('api/rating', {from: (page_number-1)*10, size: 10}).success(function(data) {
        $scope.places = data.list;
        $scope.active_page = page_number;

        $scope.center_page = Math.max(3, Math.min($scope.last_page-2, page_number));
      })

    }


}])


app.controller('RulesCtrl', ['$scope', '$rootScope', function($scope, $rootScope){

	console.log('Rules Page Ui Ctrl');

  $scope.active_rule=1;

  var rules = [

  ]

}])


app.controller('GameCtrl', ['$scope', '$rootScope', 'game', '$state', 'params', function($scope, $rootScope, game, $state, params){

  console.log('game start');



  $rootScope.game_active = 1;
  $scope.game_finished = 0;

  $scope.game_result = {
      score: 15,
      lives:  3,
      place: 99
  };

  $scope.is_user = !!params.get("uid");

	game.start($rootScope.options, $scope);

  $scope.finish = function(result) {

    setTimeout(function(){

      console.log('result', result);
      $scope.game_result = result;
      //lives
      //get place
      $scope.game_finished = 1;
      $rootScope.game_active = 0;

      $scope.share_txt  = encodeURIComponent ('Я спас от катастрофы на железной дороге ' + $scope.game_result.saved_people + ' человек и заработал ' + $scope.game_result.score + ' очков в борьбе за билеты на �?гроМир!');
      $scope.share_link  = encodeURIComponent ('http://kanobu.ru/special/rzd/?people='+$scope.game_result.saved_people+'&score='+$scope.game_result.score);
      $scope.share_title  = encodeURIComponent ('Поезд на �?гроМир');

      game.stop($scope);

      !$scope.$$phase && $scope.$digest();

    }, 2000)

  }

  $scope.$on("$destroy", function() {
    game.stop($scope);
  })

  $scope.reload_game = function(){

    $scope.game_finished = 0;
    game.start($rootScope.options, $scope);
    $rootScope.game_active = 1;
    //$state.go('game');

  }

  $scope.init_login = function(){
    window.parent.postMessage("auth", '*');
  }

}])


app.controller('TipsCtrl', ['$scope', '$rootScope', function($scope, $rootScope){

  $scope.is_opened = 0;
  $scope.current_tip = '';
  $scope.tips_que = [];
  $scope.visited_tips = [];

  $scope.$on('open_tip', function(event, data){

      if (!$scope.is_opened) {
        console.log('emit TIP', data);
        $scope.is_opened = 1;
        $scope.current_tip = data.tip;
        $scope.hero_number = Math.floor(Math.random()*3) + 1;

        console.log('is_opened', $scope.is_opened);
        !$scope.$$phase && $scope.$digest();

      }

      else if ($scope.tips_que.indexOf(data.tip) === -1){
        $scope.tips_que.push(data.tip);
      }

  });

  $rootScope.$on('close_tip', function(event, data){

    //$scope.close_this_tip();
    $scope.visited_tips.push($scope.current_tip);
    $scope.is_opened = 0;
    $scope.current_tip = '';
    !$scope.$$phase && $scope.$digest();

  })

  $scope.close_this_tip = function(){

    $rootScope.$broadcast('close_tip', {tip: $scope.current_tip});

  }

}])

app.controller('SingleTipCtrl', ['$scope', '$rootScope', function($scope, $rootScope){

  $scope.is_on = 1;

}])
