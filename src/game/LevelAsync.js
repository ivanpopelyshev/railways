/**
 * Created by Liza on 31.07.2015.
 */

var Game = require('../core');
var Generator = Game.Generator;
var Builder = Game.Builder;
var Rectangle = Game.Rectangle;
var FieldObject = Game.FieldObject;

function LevelAsync(gameRes, listener) {
    gameRes.initModels();
    this.gameRes = gameRes;
    this.options = gameRes.options;
    this.patches = [];
    this.gen = null;
    this.prevGen = null;
    this.listener = listener || null;
    this.start();
}

module.exports = LevelAsync;
LevelAsync.prototype = {
    stop: function() {
        this.worker.postMessage({ method: 'close' });
    },
    start: function() {
        var worker = this.worker = new Worker('bin/worker.js');
        var self = this;
        worker.addEventListener('message', function(e) {
            var data = e.data;
            switch (data.method) {
                case 'done':
                    if (self.callback) {
                        self.callback();
                        self.callback = null;
                    }
                    break;
                case 'removeFront':
                    self.removeFront();
                    break;
                case 'addPatch':
                    self.addPatch(data.patch);
                    break;
            }
        });

        worker.postMessage({ method: 'start', gameRes: this.gameRes.toJson()});
        return this;
    },
    addPatch: function(patchRaw) {
        var patch = new Builder();
        if (this.patches.length>0) {
            var tail = this.patches[this.patches.length-1];
            var options = this.options;
            patch.init2(tail, new Rectangle(tail.shiftX, 0, options.width, options.height));
        }
        patch.fromJson(patchRaw, this.gameRes, this.tail(0));
        if (this.options.randomWay == 1) patch.randomizeWays();

        var patch2 = new Builder();

        //testing testing , 1 , 2 , 3
        /*var buf = new Game.Buffer();
        buf.startWrite();
        patch.saveBin(buf);
        buf.startRead();
        patch2.loadBin(buf, this.gameRes, this.tail(0), this.randomWay);
        patch = patch2;
        console.log("binary bytes "+buf.len);*/

        this.patches.push(patch);
        if (this.listener) {
            this.listener.addPatch(patch);
        }
    },
    removeFront: function() {
        this.patches.pop();
        if (this.listener) {
            this.listener.removeFront();
        }
    },
    tail: function(index) {
        return this.patches[this.patches.length-1-(index|0)];
    },
    removeBack: function(cb) {
        this.patches.shift();
        this.patches[0].cutHead();
        this.worker.postMessage({method: 'removeBack', cb: true});
        //TODO: dont wait if there are enough patches
        this.callback = cb;
    },
    genSync: function(s, cb) {
        this.worker.postMessage({method: 'gen', lazyPatches: s });
        this.callback = cb;
    },
    doIt2 : function(cycles) {
        //nothing, just pinging webworker may be
    }
}
