/**
 * Created by Liza on 24.08.2015.
 */

module.exports = function ($rootScope) {
    var cache = {};
    var available = false, wasError = false;
    try {
        localStorage['test'] = "123";
        if (localStorage['test'] == "123")
            available = true;
    } catch (e) {
        console.log("localStorage is not available, or it is full", e);
    }
    //available = false;
    return {
        isAvailable: function() {
            return available;
        },
        hasError: function() {
            return !available || wasError;
        },
        getItem: function(key, def) {
            //return STRING from localStorage or def value
            if (!cache.hasOwnProperty(key) && available) {
                if (localStorage[key])
                    cache[key] = localStorage[key];
            }
            if (cache.hasOwnProperty(key))
                return cache[key];
            return def;
        },
        setItem: function(key, value) {
            cache[key] = value;
            if (available) {
                try {
                    //dont forget that its toString
                    localStorage[key] = value;
                } catch (e) {
                    console.log("localStorage is full", e);
                }
            }
        },
        removeItem: function(key) {
            if (cache.hasOwnProperty(key))
                delete cache[key];
            if (available) {
                localStorage.removeItem(key);
            }
        }
    }
};
