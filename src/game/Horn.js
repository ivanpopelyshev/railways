/**
 * Created by Liza on 20.07.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Rails = require('../core').Rails;

function Horn() {
    pixi.Container.call(this);
    //this.addChild(pointerSprite);
    //todo: show graphics
    //todo: interaction
}

Horn.prototype = Object.create(pixi.Container.prototype);
Horn.prototype.constructor = Horn;
module.exports = Horn;

Horn.prototype.init = function(way, train, resources) {
    this.way = way;
    this.train = train;
    var self = this;
    this.ready = [];
    this.popup = true;

    var horn = this.horn = new pixi.spine.Spine(resources['horn'].spineData);
    horn.state.setAnimationByName(0, "popup", false);
    horn.update(10);
    this.addChild(horn);

    horn.interactive = false;
    horn.position.x = way.level.options.width - 70;
    horn.position.y = 50;
    horn.scale.x = -1;
    // events
    function onClick(e) {
        if (self.popup) return;
        if (horn.state.tracks[0] && horn.state.tracks[0].animation.name == 'sound' && !horn.state.tracks[0].loop) return;
        while (self.ready.length>0) {
            var obst = self.ready.pop();
            if (obst.spr)
                obst.spr.click();
        }
        horn.state.setAnimationByName(0, "sound", false);
        //do it
    }
    horn.on("click", onClick);
    horn.on("touchstart", onClick);
};

Horn.prototype.showNow = function() {
    this.horn.state.setAnimationByName(0, "popdown", false);
    this.horn.update(10)
    this.horn.state.setAnimationByName(0, "sound", true);
}

Horn.prototype.update = function(dt) {
    var ready = this.ready;
    while (ready.length>0) ready.pop();

    var obstacles = this.way.obstacles;
    var w = this.train.frontWheel();
    var p1 = w.rail.pointAt(w.pos);
    for (var i=0; i<obstacles.length;i++) {
        var obst = obstacles[i];
        if (!obst.useHorn || obst.clicked) continue;
        var radius = obst.useHorn;
        var p2 = obst.position;
        var dx = p2.x - p1.x, dy = p2.y-p1.y;
        if (dx*dx+dy*dy <= radius * radius)
            ready.push(obst);
    }

    var horn = this.horn;
    if (!this.popup && ready.length == 0 && !horn.state.tracks[0]) {
        horn.state.setAnimationByName(0, "popup", false);
        this.popup = true;
        horn.interactive = false;
    }
    if (this.popup && ready.length > 0) {
        horn.state.setAnimationByName(0, "popdown", false);
        this.popup = false;
        horn.interactive = true;
    }
}
