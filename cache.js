var fs = require('fs');
var util = require('util');
var Game = require('./src/core/index.js');

var atlas = require('./public/assets/sprites.json');
var shapes = require('./public/assets/shapes.json');

function RailCache(dir, options) {
    try {
        fs.mkdirSync(dir);
    } catch (e) { }
    this.dir = dir;
    this.options = Game.setOptionDefaults(options);
};

function toBuffer(ab) {
    var buffer = new Buffer(ab.len);
    var view = new Uint8Array(ab.array);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = ab.data.getUint8(i);
    }
    return buffer;
}

RailCache.prototype = {
    generateAll: function(num) {
        for (var i=0;i<num;i++) {
            this.generateX(i);
        }
    },
    generate: function(num) {
        var p = this.dir+"/";
        try {
            fs.mkdirSync(p);
        } catch (e) { }
        if (fs.exists(p)) return;

        var level = new Game.Level(new Game.GameResources(this.options, shapes, atlas));
        for (var i=0;i<num;i++) {
            console.log("generating "+i);
            level.genSync(20);
            var buf = new Game.Buffer();
            buf.startWrite();
            for (var j=0;j<10;j++) {
                level.patches[j].saveBin(buf);
            }
            for (var j=0;j<10;j++) {
                level.removeBack();
            }
            buf.startRead();
            var p2 = p+format(Math.floor(i/1000)*1000, 6) + "/";
            try {
                fs.mkdirSync(p2);
            } catch (e) { }

            var fd = fs.openSync(p2 + format(i%1000, 6)+".dat", "w");
            //console.log(buf.array);
            fs.writeSync(fd, toBuffer(buf), 0, buf.len);
            fs.closeSync(fd);
            console.log("railpath generated " +i);
        }
    }
};


function format(id, num) {
    id=id+"";
    while (id.length<num) id = "0"+id;
    return id;
}

var cache = new RailCache("./public/railcache", {
    width: 1200,
    height: 720,
    trainStartSpeed: 35,
    trainRandomWaySpeed: 50,
    trainMaxSpeed: 90,
    trainDistanceBeforeMaxSpeed: 10000,
    traction: 1.8,
    startWays: 3,
    minWays: 3,
    maxWays: 6,
    railsSize: 3,
    stats: 1,
    grav: 1,
    clusters: 1
});

cache.generate(10000);
