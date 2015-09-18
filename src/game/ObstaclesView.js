/**
 * Created by Liza on 20.07.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Rails = require('../core').Rails;

var Obstacle = require('./obstacles/Obstacle');
var Walker = require('./obstacles/Walker');
var Runner = require('./obstacles/Runner');
var PathWay = require('./obstacles/PathWay');
var CarWay = require('./obstacles/CarWay');
var Kids = require('./obstacles/Kids');
var Junk = require('./obstacles/Junk');
var Delorean = require('./obstacles/Delorean');
function ObstaclesView() {
    pixi.Container.call(this);
    this.layers = [new pixi.Container(), new pixi.Container(), new pixi.Container(), new pixi.Container()];
    //this.addChild(pointerSprite);
    //todo: show graphics
    //todo: interaction
}

ObstaclesView.prototype = Object.create(pixi.Container.prototype);
ObstaclesView.prototype.constructor = ObstaclesView;
module.exports = ObstaclesView;

ObstaclesView.prototype.init = function(train, resources, listener) {
    this.train = train;
    var way = this.way = train.way;
    var self = this;
    this.selected = null;
    this.listener = listener;
    this.paused = false;

    var typeNames = ['phones', 'runner', 'lights', 'highway', 'kids', 'junk', 'delorean'];
    var types = [Walker, Runner, PathWay, CarWay, Kids, Junk, Delorean];

    way.listener = {
        onAdd: function(obst) {
            var F = Obstacle;
            var tp = "none";
            var ind = -1;
            for (var i=0;i<typeNames.length;i++) {
                if (obst.name.substring(0, typeNames[i].length) == typeNames[i]) {
                    tp = typeNames[i];
                    F = types[i];
                    ind = i;
                }
            }
            var spr = obst.spr = new F(self, resources).init(obst, resources['sprites']);
            obst.typeName = tp;
            obst.typeIndex = ind;
            self.addChild(spr);
            for (var i=0;i<spr.layers.length;i++)
                if (spr.layers[i])
                    self.layers[i].addChild(spr.layers[i]);
            if (spr.flatLayers) {
                for (var i=0;i<spr.flatLayers.length;i++) {
                    var list = spr.flatLayers[i];
                    for (var j=0;j<list.length;j++) {
                        self.layers[i].addChild(list[j]);
                    }
                }
            }
        },
        onUpdate: function(obst, dt, maxX) {
            if (obst.spr)
                obst.spr.update(dt, maxX);
        },
        onRemove: function(obst) {
            var spr = obst.spr;
            if (!spr) return;
            self.removeChild(spr);
            for (var i=0;i<spr.layers.length;i++)
                if (spr.layers[i])
                    self.layers[i].removeChild(spr.layers[i]);
            if (spr.flatLayers) {
                for (var i=0;i<spr.flatLayers.length;i++) {
                    var list = spr.flatLayers[i];
                    for (var j=0;j<list.length;j++) {
                        self.layers[i].removeChild(list[j]);
                    }
                }
            }
            obst.spr = null;
        },
        onChange: function(obst) {
            obst.spr.change();
        }
    }
};
ObstaclesView.prototype.shiftX = function(shiftX) {
    this.position.x = -shiftX;
    for (var i=0;i<this.layers.length;i++)
        this.layers[i].position.x = -shiftX;
}

ObstaclesView.prototype.onclick = function(obst) {
    if (this.listener) return this.listener.onclick(obst);
    return true;
}

