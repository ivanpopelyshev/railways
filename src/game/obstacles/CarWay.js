/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Obstacle = require('./Obstacle');
var Game = require('../../core');
var Car = require('./Car');

function CarWay(obstacles, resources) {
    Obstacle.call(this, obstacles, resources);
    this.flatLayers = [[], []];
    this.shlagbaum = [];
}

CarWay.prototype = Object.create(Obstacle.prototype);
CarWay.prototype.constructor = CarWay;
module.exports = CarWay;

CarWay.prototype.postInit = function () {
    this.h = 20;
    this.lineHeight = this.obst.way.level.gameRes.options.height;
    //shlagbaum!!!
    this.flatLayers[1].push(this.newShlagbaum(0, -20, 1));
    this.flatLayers[1].push(this.newShlagbaum(130, 20, -1));
    Obstacle.prototype.postInit.call(this);
}

CarWay.prototype.newShlagbaum = function(x, y, dx) {
    var obst = this.obst;
    var d = this.resources['shlagbaum'].spineData;
    var s1 = new pixi.spine.Spine(d);
    s1.state.setAnimationByName(0, d.animations[0].name, false);
    s1.update(0);
    s1.autoUpdate = false;
    s1.scale.x = s1.scale.y = 0.3;
    s1.position.x = obst.position.x + x;
    s1.position.y = obst.position.y + y;
    s1.scale.x = dx * s1.scale.x;
    this.shlagbaum.push(s1);
    return s1;
}

CarWay.prototype.newCar = function (dy) {
    var models = this.obst.carModels;
    var car = new Car().init(this.sprites, models[Math.random() * models.length | 0]);
    car.side = dy >= 0 ? 0 : 1;
    car.updateFrame();
    return car;
}

CarWay.prototype.update = function (dt, maxX) {
    Obstacle.prototype.update.call(this, dt, maxX);
    var obst = this.obst;
    if (obst.position.x >= maxX) return;

    if (obst.state>=1) {
        for (var i=0;i<this.shlagbaum.length;i++)
            this.shlagbaum[i].update(dt);
    }

    for (var i = 0; i < this.lines.length; i++) {
        var line = this.lines[i];
        var dy = line.dy;
        var v = dy * obst.vel * dt;
        var next = null;
        var cars = line.cars;
        //populate lines if needed
        if (cars.length == 0 && obst.state == 0)
            next = line.end;
        for (var j = cars.length - 1; j >= 0; j--) {
            var car = cars[j];
            if (obst.state >= 1) {
                if ((obst.position.y - car.position.y) * dy >= obst.minDistance-1 &&
                    (next == null || (next - obst.position.y) * dy >= 0))
                    next = obst.position.y;
            }
            car.position.y += v;
            if (next != null && (next - car.position.y) * dy <= obst.minDistance) {
                car.position.y = next - obst.minDistance * dy;
            }
            next = car.position.y;
        }
        while (cars.length > 0 && (cars[cars.length - 1].position.y - line.end) * dy >= 0) {
            var car = line.cars.pop();
            this.flatLayers[1].splice(this.flatLayers[1].indexOf(car), 1);
            this.obstacles.layers[1].removeChild(car);
        }
        while (next != null && (next - line.start) * dy >= obst.betweenMin) {
            var car = this.newCar(dy);
            next -= dy * (obst.betweenMin + Math.random() * (obst.betweenMax - obst.betweenMin));
            car.position.x = line.x;
            car.position.y = next;
            cars.unshift(car);
            this.flatLayers[1].push(car);
            this.obstacles.layers[1].addChild(car);
        }
    }
}

CarWay.prototype.change = function () {
    //only once!
    var obst = this.obst;
    this.lines = [
        {x: obst.position.x + 40, start: -50, end: this.lineHeight + 50, dy: 1, cars: [], stop: -1},
        {x: obst.position.x + 87, start: this.lineHeight + 50, end: -50, dy: -1, cars: [], stop: -1}
    ]
    this.update(0);
    Obstacle.prototype.change.call(this);
    this.position.x += 64;
}
