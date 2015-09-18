/**
 * Created by Liza on 13.08.2015.
 */

module.exports = function($rootScope, $http, params) {
    return {
        startGame: function(s, f) {
            if (params.get("uid")) {
                $http.post('api/startGame', {}).success(s).error(f);
            } else f();
        },
        trackGame: function(result, s, f) {
            if (params.get("uid")) {
                $http.post('api/trackGame', result).success(s).error(f);
            } else f();
        },
        finishGame: function(result, s, f) {
            $http.post('api/finishGame', result).success(s).error(f);
        }
    }
};
