module.exports = function(app) {
    window.page_params = {};
    var p = location.search.substring(1).split("&");
    for (var i=0;i<p.length;i++) {
        var v = p[i].indexOf("=");
        if (v>=0)
            page_params[p[i].substring(0, v)] = decodeURIComponent(p[i].substring(v+1));
    }
    app.service('params', function() {
        var params = {  };
        //VK
        if (page_params['uid']) {
            params['uid'] = page_params['uid'],
                params['uname'] = page_params['uname'],
                params['key'] = page_params['key']
        }

        return {
            get: function(key) {
                if (key) return params[key];
                return params;
            },
            getParam: function (key) {
                if (key) return page_params[key] || null;
                return page_params
            }
        }
    });
    app.factory('myHttpResponseInterceptor', function($q, $location, params, $rootScope) {
        //for iframes!
        var override_params = params.get();
        var apiUri = 'api/';

        return {
            request: function(config) {
                if (config.url.substring(0, apiUri.length) == apiUri) {
                    config.params = config.params || {}
                    for (var key in override_params)
                        if (override_params.hasOwnProperty(key))
                            config.params[key] = override_params[key];
                }
                return config;
            }
        }
    });
    app.config(function($httpProvider) {
        $httpProvider.interceptors.push('myHttpResponseInterceptor');
        $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
    });
};
