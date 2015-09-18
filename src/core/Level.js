/**
 * Created by Liza on 31.07.2015.
 */

var Point = require('./pixi/Point');
var Rectangle = require('./pixi/Rectangle');
var Rails = require('./Rails');
var Path = require('./Path');
var FieldObject = require('./FieldObject');
var Generator = require('./Generator');
var Builder = require('./Builder');

function Level(gameRes, listener) {
    gameRes.initModels();
    //init models
    this.gameRes = gameRes;
    this.options = gameRes.options;
    this.rails = gameRes.rails;
    this.patches = [];
    this.gen = null;
    this.prevGen = null;
    this.listener = listener || null;
    this.start();
}

module.exports = Level;
Level.prototype = {
    start: function() {
        var gameRes = this.gameRes;
        var rails = gameRes.rails;
        var options = gameRes.options;
        var patch = new Builder();
        patch.init1(gameRes, new Path().init1(rails, new Point(0, options.height/2), rails.grad * 6/8, options.wayLen), false);
        if (options.startWays == 2) {
            var path = new Path().init1(rails, new Point(0, 220), rails.grad * 6/8, options.wayLen);
            patch.paths.push(path);
            patch.start++;
            patch.finish.push(path);
        }
        this.addPatch(patch);
        return this;
    },
    addPatch: function(patch) {
        this.patches.push(patch);
        this.prevGen = this.gen;
        this.initGen();
        if (this.listener) {
            this.listener.addPatch(patch);
        }
        this.removed = false;
    },
    removeFront: function() {
        this.patches.pop();
        this.gen = this.prevGen;
        this.prevGen = null;
        if (!this.gen) this.initGen();//
        if (this.listener) {
            this.listener.removeFront();
        }
        this.removed = true;
    },
    tail: function(index) {
        return this.patches[this.patches.length-1-(index|0)];
    },
    initGen: function() {
        var patch = this.tail();
        if (!patch) return;
        var options = this.options;
        this.gen = new Generator(patch, {
            rect: new Rectangle(patch.shiftX, 0, options.width, options.height),
            rect2: new Rectangle(patch.shiftX, options.topOffset, options.width, options.height - options.bottomOffset - options.topOffset),
            endStation: options.endStation,
            endLen: 50,
            minWays: options.minWays,
            maxWays: options.maxWays,
            intersections: options.intersections,
            topOffset: options.topOffset,
            clusters : options.clusters
        });
    },
    addPatchForSure: function() {
        var gen = this.gen;
        gen.doIt(30, this.removed);
        var patch = gen.finish();
        if (!patch) {
            if (this.patches.length>1) {
                this.removeFront();
                this.addPatchForSure();
                this.addPatchForSure();
            } else {
                gen.tries = 0;
                this.addPatchForSure();
            }
        } else {
            this.addPatch(patch);
        }
    },
    removeBack: function(cb) {
        this.patches.shift();
        this.patches[0].cutHead();
        this.genSync(4, cb);
    },
    genSync: function(s, cb) {
        while (this.patches.length<(s||5)) {
            this.addPatchForSure();
        }
        cb && cb();
    },
    doIt2 : function(cycles) {
        var options = this.options;
        if (this.patches.length>=options.lazyPatches) return false;
        var gen = this.gen;
        gen.doIt2(cycles);
        if (gen.tries>30) {
            var patch = gen.finish();
            if (!patch) {
                if (!this.removed)
                    this.removeFront();
                this.gen.resetIfNoWay();
                this.genSync();
            } else
                this.addPatch(patch);
        }
        return true;
    }
}
