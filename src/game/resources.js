/**
 * Created by Liza on 13.08.2015.
 */

var pixi = require("pixi.js")
var spine = require('pixi-spine')

module.exports = function ($rootScope, $q) {
    var promises = [];

    function load() {
        var loader = new pixi.loaders.Loader();
        loader.add('back', 'assets/back2.png');
        loader.add('wagon', 'assets/wagon_shadow15.png');
        loader.add('loco', 'assets/loco_shadow15.png');

        //mods here
        loader.add('particle', 'assets/particle.png');
        loader.add('delorean', 'assets/delorean2.png');
        loader.add('river2', 'assets/river/river2.png');;
        loader.add('riverbig1', 'assets/river/bigriver1.png');
        loader.add('riverbig2', 'assets/river/bigriver2.png');
        loader.add('riverbig3', 'assets/river/bigriver3.png');
        loader.add('bridgeSE_top', 'assets/river/bridgeSE_top.png');
        loader.add('bridgeSE_base', 'assets/river/bridgeSE_base.png');
        loader.add('bridgeNE_top', 'assets/river/bridgeNE_top.png');
        loader.add('bridgeNE_base', 'assets/river/bridgeNE_base.png');
        loader.add('bridgeE_top', 'assets/river/bridgeE_top.png');
        loader.add('bridgeE_base', 'assets/river/bridgeE_base.png');
        loader.add('grav', 'assets/grav.png');

        //obstacles
        loader.add('shlagbaum', 'assets/spine/shlagbaum.json');
        loader.add('horn', 'assets/spine/horn.json');
        loader.add('alertbar', 'assets/spine/alertbar.json');

        loader.add('sprites', 'assets/sprites.json');
        loader.add('shapes', 'assets/shapes.json');

        loader.load(function (loader, res) {
            function removePngNames(obj) {
                var o = {};
                for (var key in obj)
                    o[key.replace(/\.png$/i, "")] = obj[key];
                return o;
            }

            if (!res.sprites.data) {
                //try again!!!
                console.log("failed to load resources, trying again");
                load();
                return;
            }
            res.sprites.data.frames = removePngNames(res.sprites.data.frames);
            res.sprites.textures = removePngNames(res.sprites.textures);
            service.list = res;
            for (var i = 0; i < promises.length; i++)
                promises[i].resolve(res);
        });
    }
    load();

    var theme = document.getElementById("theme");
    theme.loop = true;
    theme.volume = 0.5;

    var service = {
        load: function() {
            var q = $q.defer();
            if (this.list) {
                q.resolve(this.list);
            } else promises.push(q);
            return q.promise;
        },
        theme: theme
    };

    return service;
}
