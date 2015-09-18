(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Created by Liza on 02.08.2015.
 */

var Game = require('../core');
var Point = Game.Point;
var Level = Game.Level;
var Rails = Game.Rails;
var GameResources = Game.GameResources;
var FieldObject = Game.FieldObject;

var rails;
var level, options;

var genTest = 0, genCallback = null;

var listener = {
    removeFront: function() {
        self.postMessage({
            method: "removeFront"
        });
    },
    addPatch: function(patch) {
        self.postMessage({
            method: "addPatch",
            patch: patch.toJson()
        });
        if (level && level.patches.length >= genTest && genCallback) {
            genCallback();
            genCallback = null;
        }
    }
};

self.addEventListener('message', function(e) {
    var data = e.data;
    switch (data.method) {
        case 'start':
            options = data.gameRes.options;
            //options.seed = 5;
            useAjax = options.hasOwnProperty("seed");
            if (useAjax) {
                options.seed = (options.seed%5000);
                ajaxNum = options.seed;
            }
            level = new Level(new GameResources().fromJson(data.gameRes), listener);
            break;
        case 'gen':
            genTest = data.lazyPatches;
            genCallback = function() {
                self.postMessage({method: 'done'});
                resumeGen();
            };
            if (useAjax) {
                tryAjax();
            } else {
                level.genSync(data.lazyPatches);
            }
            break;
        case 'close':
            self.close();
            break;
        case 'removeBack':
            level.removeBack(function() {
                if (data.cb)
                    self.postMessage({method: 'done'});
                resumeGen();
            });
            break;
    }
}, false);

var useAjax = false, waitingAjax = false;
var ajaxNum = 0;
function tryAjax() {
    if (waitingAjax) return;
    if (level.patches.length>=10) return;

    waitingAjax=new XMLHttpRequest();
    //waitingAjax.overrideMimeType('text\/plain; charset=x-user-defined');
    waitingAjax.onreadystatechange=function(){
        if (waitingAjax.readyState!=4) return;
        if (waitingAjax.status==200) {
            //var resp = waitingAjax.response;
            //var buf = new Game.Buffer(resp.length);
            //for (var i=0;i<resp.length;i++) buf.data.setUint8(i, resp.charCodeAt(i));
            //buf.pos = resp.length;
            //buf.startRead();
            var buf = new Game.Buffer(waitingAjax.response);

            if (level.patches.length == 1 && ajaxNum == options.seed) {
                level.removeFront();
            }
            while (buf.pos<buf.len) {
                var patch = new Game.Builder();
                patch.loadBin(buf, level.gameRes, level.tail(0), false);
                level.addPatch(patch);
            }
            waitingAjax = false;
            ajaxNum++;
            tryAjax();
        } else {
            useAjax = false;
            level.removed = true;
            resumeGen();
        }
    };

    waitingAjax.open("GET", "../railcache/"+format(Math.floor(ajaxNum/1000)*1000, 6) + "/" + format(ajaxNum%1000, 6)+".dat",true);
    waitingAjax.responseType = "arraybuffer";
    waitingAjax.send();
}

function format(id, num) {
    id=id+"";
    while (id.length<num) id = "0"+id;
    return id;
};

function resumeGen() {
    if (useAjax )
        tryAjax();
    else
    if (!timeout)
        timeout = setTimeout(generation, 0);
}

var timeout = 0;

function generation() {
    timeout = 0;
    if (level.doIt2(500)) {
        resumeGen();
    }
}

},{"../core":17}],2:[function(require,module,exports){
/**
 * Created by Liza on 23.07.2015.
 */

var Rectangle = require('./pixi/Rectangle');

function AABB(bounds) {
    this.bounds = bounds;
}
module.exports = AABB;

AABB.prototype = {
    getBounds: function() {
        return this.bounds;
    },
    intersectRect: function(rect) {
        var bounds = this.bounds;
        return Math.max(rect.x, bounds.x) <= Math.min(rect.x + rect.width, bounds.x + bounds.width) &&
            Math.max(rect.y, bounds.y) <= Math.min(rect.y + rect.height, bounds.y + bounds.height);
    }
}

},{"./pixi/Rectangle":19}],3:[function(require,module,exports){
/**
 * Created by Liza on 04.09.2015.
 */

function Buffer(capacity) {
    if (capacity instanceof ArrayBuffer) {
        this.array = capacity;
        this.data = new DataView(this.array);
        this.capacity = this.len = this.array.byteLength;
        this.pos = 0;
        this.readMode = true;//
    } else {
        this.capacity = capacity || (1 << 20);
        this.array = new ArrayBuffer(this.capacity);
        this.data = new DataView(this.array);
        this.startWrite();
    }
}

module.exports = Buffer;

Buffer.prototype = {
    pos: 0,
    readMode: false,
    writeInt: function (intValue) {
        if (this.readMode) throw "not write mode";
        if (this.pos + 4 > this.capacity) throw "write beyond capacity";
        this.data.setInt32(this.pos, intValue | 0);
        this.pos += 4;
    },
    writeFloat: function (floatValue) {
        if (this.readMode) throw "not write mode";
        if (this.pos + 4 > this.capacity) throw "write beyond capacity";
        this.data.setFloat32(this.pos, floatValue);
        this.pos += 4;
    },
    writeString: function (stringValue) {
        if (this.readMode) throw "not write mode";
        var len = stringValue.length;
        if (this.pos + 4 * (1 + len) > this.capacity) throw "write beyond capacity";
        this.data.setInt32(this.pos, len);
        for (var i = 0; i < len; i++)
            this.data.setInt32(this.pos + 4 * (i + 1), stringValue.charCodeAt(i));
        this.pos += 4 * (1 + len);
    },
    readInt: function () {
        if (!this.readMode) throw "not read mode";
        if (this.pos + 4 > this.len) throw "read beyond end";
        var intValue = this.data.getInt32(this.pos);
        this.pos += 4;
        return intValue;
    },
    readFloat: function (floatValue) {
        if (!this.readMode) throw "not read mode";
        if (this.pos + 4 > this.len) throw "read beyond end";
        var floatValue = this.data.getFloat32(this.pos);
        this.pos += 4;
        return floatValue;
    },
    readString: function () {
        if (!this.readMode) throw "not read mode";
        if (this.pos + 4 > this.len) throw "read beyond end";
        var len = this.data.getInt32(this.pos);
        if (this.pos + 4 * (1 + len) >= this.len) throw "read beyond end";
        var s = "";
        for (var i = 0; i < len; i++)
            s += String.fromCharCode(this.data.getInt32(this.pos + 4 * (i + 1)));
        this.pos += 4 * (1 + len);
        return s;
    },
    startRead: function () {
        this.readMode = true;
        this.len = this.pos;
        this.pos = 0;
    },
    startWrite: function () {
        this.len = 0;
        this.pos = 0;
        this.readMode = false;
    }
}

},{}],4:[function(require,module,exports){
var Point = require('./pixi/Point');
var Rails = require('./Rails');
var Path = require('./Path');
var Segment = require('./Segment');
var FieldObject = require('./FieldObject');

function Builder() {
    this.objects = [];
    this.start = 0;
    this.paths = [];
    this.finish = [];
    this.prevObjects = [];
    this.prevPath = [];
};

var test = [];
Builder.prototype = {
    length: 0,
    shiftX: 0,
    highway: 0,
    cutHead: function() {
        for (var i=0;i<this.start;i++)
            this.paths[i].cutHead();
    },
    minLength: function() {
        while (test.length>0) test.pop();
        for (var i=0;i<this.paths.length;i++)
            test.push(this.paths[i].length)
        test.sort();
        var res = 0;
        for (var i=0;i<test.length;i++)
            res += (test.length-i)*test[i];
        res += this.gameRes.options.endStationCoeff * this.objects.length;
//        var res = this.finish[0].tail().pos;
//        for (var i=1;i<this.finish.length;i++) {
//            res = Math.min(res, this.finish[i].tail().pos);
//        }
        return res;
    },
    clear: function() {
        while (this.objects.length>0)
            this.objects.pop();
        while (this.paths.length>this.start)
            this.paths.pop();
        while (this.finish.length>0)
            this.finish.pop();
        for (var i=0;i<this.paths.length;i++) {
            this.paths[i].clear();
            this.finish.push(this.paths[i]);
        }
        this.length = 0;
        for (var i=0;i<this.start.length; i++)
            this.length += this.start[i].length;
    },
    addToGrid: function (grid) {
        var addie = grid.addObject.bind(grid);
        for (var i=0;i<this.paths.length;i++) {
            var path = this.paths[i];
            var seg = path.segments;
            for (var j=0;j<seg.length; j++)
                addie(seg[j]);
        }
        this.objects.forEach(addie);
        this.prevObjects.forEach(addie);
        this.prevPath.forEach(addie);
    },
    init1: function(gameRes, path, station) {
        this.rails = path.rails;
        this.gameRes = gameRes;
        this.paths = [path];
        this.start = 1;
        this.finish = this.paths.slice(0);
        if (station)
            this.objects.push(this.createStation(path.head.startPosition, path.head.startAngle));
        this.length = path.length;
    },
    init2: function(prevBuilder, rect) {
        this.rails = prevBuilder.rails;
        this.gameRes = prevBuilder.gameRes;
        var self = this;
        prevBuilder.prevObjects.forEach(function(obj) {
            if (obj.intersectRect(rect)) self.prevObjects.push(obj);
        });
        prevBuilder.objects.forEach(function(obj) {
            if (obj.intersectRect(rect)) self.prevObjects.push(obj);
        });
        prevBuilder.prevPath.forEach(function(obj) {
            if (obj.intersectRect(rect)) self.prevPath.push(obj);
        });
        prevBuilder.paths.forEach(function(path) {
            path.segments.forEach(function(obj) {
                if (obj.intersectRect(rect)) self.prevPath.push(obj);// self.prevPath.push(new Segment().copy(obj));
            });
        });
        this.start = prevBuilder.finish.length;
        for (var i=0; i<this.start;i++) {
            this.paths.push(new Path().init2(prevBuilder.finish[i]));
        }
        this.start = this.paths.length;
        this.finish = this.paths.slice(0);
        //temporary for test
        this.length = 0;
        for (var i=0;i<this.start; i++) {
            this.paths[i].pos = 0;
        }
    },
    createStation: function(position, angle) {
        var rails = this.rails;
/*        if (angle == rails.grad * 7/8) {
            return new FieldObject(this.models["new_station2"], new Point(position.x - 17, position.y - 62));
        } else  if (angle == rails.grad * 5/8) {
            return new FieldObject(this.models["new_station1"], new Point(position.x - 46, position.y - 215));
        } else if (angle == rails.grad * 6/8) {
            return new FieldObject(this.models["new_station3"], new Point(position.x - 00, position.y - 150));
        } else return null;*/
        var st = this.gameRes.stations;
        while (test.length>0) test.pop();
        for (var i=0;i<st.length;i++) {
            var s = st[i];
            if (angle == rails.grad * s.angle/8) {
                test.push(s);
            }
        }
        if (test.length==0) return null;
        var s = test[Math.random() * test.length | 0];
        var objs = { list: [], railLen: s.railLen, bonusRail: s.bonusRail } ;
        for (var j=0;j< s.list.length;j++) {
            var m = s.list[j];
            var obj = new FieldObject(this.gameRes.models[m.model], new Point(position.x + m.x, position.y + m.y));
            obj.name = m.name || obj.name;
            objs.list.push(obj);
        }
        return objs;
    },
    clone: function() {
        var b = new Builder();
        b.rails = this.rails;
        b.gameRes = this.gameRes;
        b.start = this.start;
        b.highway = this.highway;
        var railClones = {};
        for (var i=0;i<this.paths.length;i++) {
            var path = this.paths[i].clone();
            var seg = path.segments;
            b.paths.push(path);
            if (i>=this.start) {
                path.head = railClones[path.head.id] || path.head;
            }
            for (var j=0;j<seg.length;j++) {
                railClones[seg[j].id] = seg[j];
            }
        }
        for (var i=0; i<this.finish.length;i++) {
            var k = this.paths.indexOf(this.finish[i]);
            b.finish.push(b.paths[k]);
        }
        for (var i=0;i<b.paths.length;i++) {
            var path = b.paths[i];
            for (var j=0;j<path.waysIn.length; j++) {
                var w = path.waysIn[j];
                w.pathFrom = b.paths[this.paths.indexOf(w.pathFrom)];
                w.railFrom = railClones[w.railFrom.id] || w.railFrom;
                w.railTo = railClones[w.railTo.id] || w.railTo;
            }
            for (var j=0;j<path.waysOut.length; j++) {
                var w = path.waysOut[j];
                w.pathTo = b.paths[this.paths.indexOf(w.pathTo)];
                w.railFrom = railClones[w.railFrom.id] || w.railFrom;
                w.railTo = railClones[w.railTo.id] || w.railTo;
            }
            this.paths[i].check();
            path.check();
        }
        b.objects = this.objects.slice(0);
        for (var i=0;i<b.objects.length;i++) {
            var obj = b.objects[i];
            if (obj.rail)
                obj.rail = railClones[obj.rail.id];
        }
        b.length = this.length;
        b.prevObjects = this.prevObjects;
        b.prevPath = this.prevPath;
        return b;
    },
    initLinkedList: function(cut) {
        for (var i = 0; i < this.paths.length; i++) {
            var path = this.paths[i];
            var seg = path.segments;
            if (i<this.start) {
                path.head.pos = path.head.len;
                //recovery. we have a problem in generator.
                //TODO: remove it!
                if (path.segments[0] && path.segments[0] != path.head) {
                    path.head.pos = path.segments[0].pos - path.segments[0].len;
                } else if (path.segments[1]) {
                    path.head.pos = path.segments[1].pos - path.segments[1].len;
                }
            }
            for (var j=1;j<seg.length;j++) {
                var segment = seg[j];
                seg[j-1].next = seg[j];
                seg[j-1].nextPos = 0;
                seg[j].prev = seg[j-1];
                if (!cut)
                    seg[j].pos = seg[j-1].pos + seg[j].len;
            }
            for (var j=0;j<path.waysIn.length;j++) {
                var way = path.waysIn[j];
                var tail = way.pathFrom.tail();
                tail.next = way.railTo;
                tail.nextPos = way.posTo - (way.railTo.pos - way.railTo.len - path.head.pos);
            }
        }
        for (var i = this.paths.length-1; i >= 0; i--) {
            var path = this.paths[i];
            var seg = path.segments;
            if (!path.isStart()) {
                if (this.paths.indexOf(path.head.path) < 0) {
                    path.head.next = seg[0];
                    path.head.nextPos = 0;
                }
                seg[0].prev = path.head;
            }
        }
    },
    randomizeWays: function() {
        for (var i = 0; i < this.paths.length; i++) {
            var path = this.paths[i];
            var seg = path.segments;
            if (path.waysOut.length>0) {
                var way = path.waysOut[(path.waysOut.length + 1) * Math.random() | 0];
                if (way) {
                    var tail = way.railFrom;
                    tail.next = way.railTo;
                    tail.nextPos = way.posTo - (way.railTo.pos - way.railTo.len - way.pathTo.head.pos);
                }
            }
        }
    },
    canRemove: function(path) {
        return !path.canPop() && this.paths.indexOf(path)>=this.start;
    },
    addPath: function(path) {
        this.paths.push(path);
        if (!path.mergesTo)
            this.finish.push(path);
    },
    removePath: function(path) {
        this.paths.splice(this.paths.indexOf(path), 1);
        var k = this.finish.indexOf(path);
        if (k>=0)
            this.finish.splice(k, 1);
        return k>=0;
    },
    toJson: function() {
        return {
            shiftX : this.shiftX,
            start: this.start,
            highway: this.highway,
            objects: this.objects.map(toJson),
            paths: this.paths.map(toJson),
            finish: this.finish.map(toJsonId)
        };
    },
    fromJson: function(json, gameRes, previousPatch) {
        var segmentById = {};
        var pathById = {};
        var rails = this.rails = gameRes.rails;
        this.gameRes = gameRes;
        this.start = json.start;
        this.shiftX = json.shiftX;
        this.highway = json.highway;
        this.paths = json.paths.map(function(obj) {
            var p = new Path().fromJson(obj, rails);
            pathById[p.id]=p;
            p.segments.forEach(function(obj) {
                segmentById[obj.id] = obj
            });
            return p;
        });
        this.objects = json.objects.map(function(obj) {
            var f = new FieldObject(gameRes.models[obj.model], obj.position, obj.scale, obj.name);
            if (obj.railId) {
                f.rail = segmentById[obj.railId];
                f.rail.mapObj = obj;
            }
            return f;
        });
        this.finish = json.finish.map(function(id) { return pathById[id] });
        if (previousPatch)
            previousPatch.finish.forEach(function(obj) { segmentById[obj.tail().id] = obj.tail(); });
        this.paths.forEach(function(obj) { obj.fromJsonStep2(segmentById, pathById) });
        this.initLinkedList();
        return this;
    },
    saveBin: function(buffer) {
        var self = this;
        function save(x) {
            x.saveBin(buffer, self.gameRes.models);
        }
        buffer.writeFloat(this.shiftX);
        buffer.writeInt(this.start);
        buffer.writeFloat(this.highway);
        buffer.writeInt(this.paths.length);
        this.paths.forEach(save);
        buffer.writeInt(this.objects.length);
        this.objects.forEach(save);
        buffer.writeInt(this.finish.length);
        this.finish.forEach(function(x) {buffer.writeInt(x.id);});
    },
    loadBin: function(buffer, gameRes, previousPatch) {
        var segmentById = {};
        var pathById = {};
        var rails = this.rails = gameRes.rails;
        this.gameRes = gameRes;
        this.shiftX = buffer.readFloat();
        this.start = buffer.readInt();
        this.highway = buffer.readFloat();
        for (var i=buffer.readInt();i>0;i--) {
            var path = new Path();
            path.rails = rails;
            path.loadBin(buffer);
            pathById[path.id] = path;
            path.segments.forEach(function(obj) {
                segmentById[obj.id] = obj
            });
            this.paths.push(path);
        }
        for (var i=buffer.readInt();i>0;i--) {
            var obj = FieldObject.prototype.createFromBin(buffer, this.gameRes.models);
            if (obj.railId) {
                obj.rail = segmentById[obj.railId];
                obj.rail.mapObj = obj;
            }
            this.objects.push(obj);
        }
        for (var i=buffer.readInt();i>0;i--) {
            var id = buffer.readInt();
            this.finish.push(pathById[id]);
        }
        var cut = !previousPatch;
        if (previousPatch) {
            previousPatch.finish.forEach(function (obj) {
                segmentById[obj.tail().id] = obj.tail();
            });
            for (var i=0;i<this.start;i++) {
                var path = this.paths[i];
                if (path.head == path.segments[0].id)
                    path.segments.shift();
            }
        }
        if (cut) {
            for (var i=0;i<this.start;i++) {
                var path = this.paths[i];
                path.head = path.segments[0].id;
            }
        }
        this.paths.forEach(function(obj) { obj.fromJsonStep2(segmentById, pathById) });
        this.initLinkedList(cut);
        this.superFix();
        return this;
    },
    superFix: function() {
        var paths = this.paths;
        for (var i=0;i<paths.length;i++) {
            var path = paths[i];
            var segments = path.segments;
            for (var j=0;j<segments.length;j++) {
                if (j==0 && path.isStart()) continue;
                var seg = segments[j];
                var sx = seg.prev.endPosition.x - seg.startPosition.x;
                seg.positions = null;
                seg.startPosition.x += sx;
                seg.centerPosition.x += sx;
                seg.endPosition.x += sx;
            }
        }
    }
};

var toJson = function(obj) {return obj.toJson(); };
var toJsonId = function(obj) {return obj.id; };

module.exports = Builder;

},{"./FieldObject":5,"./Path":10,"./Rails":11,"./Segment":12,"./pixi/Point":18}],5:[function(require,module,exports){
/**
 * Created by Liza on 23.07.2015.
 */

var Point = require('./pixi/Point');
var Rectangle = require('./pixi/Rectangle');

function FieldObject(model, fixtures, scale, name) {
    this.positions = [];
    if (model.name) {
        this.name = name || model.name;
        this.translate(model, fixtures, scale);
    } else
    if (fixtures) {
        this.proto = this;
        this.name = model;
        this.fixtures = fixtures;
        this.filter = 0;
        this.density = fixtures[0].density;
        for (var i=0;i<fixtures.length;i++) {
            var row = [];
            this.filter |= fixtures[i].filter.categoryBits;
            this.positions.push(row);
            for (var j=0;j<fixtures[i].shape.length;j+=2) {
                var point = new Point(fixtures[i].shape[j], fixtures[i].shape[j+1]);
                row.push(point);
            }
        }
        var b = this.getBounds();
        this.anchor = new Point(b.x + b.width/2, b.y + b.height/2);
    }
}

module.exports = FieldObject;

FieldObject.prototype = {
    //convex: true,
    translate: function(model, position, scale) {
        this.proto = model;
        this.position = position;
        this.scale = scale = scale || new Point(1, 1);
        this.positions = [];
        for (var i = 0; i < model.positions.length; i++) {
            var row = [];
            this.positions.push(row);
            for (var j = 0; j < model.positions[i].length; j++) {
                var point = new Point(model.positions[i][j].x*scale.x + position.x, model.positions[i][j].y*scale.y + position.y);
                row.push(point);
            }
        }
    },
    getBounds: function() {
        if (!this.bounds) {
            var p = this.positions[0][0];
            var minX = p.x, maxX = p.x, minY = p.y, maxY = p.y;
            for (var i = 0; i < this.positions.length; i++)
                for (var j = 0; j < this.positions[i].length; j++) {
                    p = this.positions[i][j];
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                }
            this.bounds = new Rectangle(minX, minY, maxX - minX, maxY - minY);
        }
        return this.bounds;
    },
    intersectRect: function(rect) {
        for (var i = 0; i < this.positions.length; i++) {
            var n = this.positions[i].length;
            var minY= +1e+9, maxY =-1e+9;
            var found = 0;
            for (var j = 0; j < n; j++) {
                var p1 = this.positions[i][j];
                var p2 = this.positions[i][(j+1)%n];
                if (p1.x>p2.x) {
                    var t = p1;p1=p2;p2=t;
                }
                if (rect.x <= p1.x && rect.x + rect.width >= p2.x) {
                    minY = Math.min(minY, Math.min(p1.y, p2.y));
                    maxY = Math.max(maxY, Math.max(p1.y, p2.y));
                } else
                {
                    if (rect.x + rect.width >= p1.x && rect.x + rect.width <= p2.x) {
                        var y = (rect.x + rect.width - p1.x) / (p2.x - p1.x) * (p2.y - p1.y) + p1.y;
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                    }
                    if (rect.x <= p2.x && rect.x >= p1.x) {
                        var y = (rect.x - p1.x) / (p2.x - p1.x) * (p2.y - p1.y) + p1.y;
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
            if (Math.max(minY, rect.y) <= Math.min(maxY, rect.y + rect.height)) return true;
        }
        return false;
    },
    liesInRect: function(rect) {
        for (var i = 0; i < this.positions.length; i++) {
            var n = this.positions[i].length;
            for (var j = 0; j < n; j++) {
                var p1 = this.positions[i][j];
                if (!rect.contains(p1.x, p1.y))
                    return false;
            }
        }
        return true;
    },
    toJson: function() {
        if (this.proto != null) {
            return {
                name: this.name,
                model: this.proto.name,
                position: this.position,
                scale: this.scale,
                railId: this.rail?this.rail.id:0
            }
        } else {
            return {
                name: this.name,
                fixtures: this.fixtures
            }
        }
    },
    saveBin: function (buffer, models) {
        var nameId = this.getKeyNumber(models, this.name);
        buffer.writeInt(nameId);
        if (nameId == -1) {
            buffer.writeString(this.name);
        }
        var modelId = this.getKeyNumber(models, this.proto.name);
        buffer.writeInt(modelId);
        buffer.writeFloat(this.position.x);
        buffer.writeFloat(this.position.y);
        buffer.writeFloat(this.scale.x);
        buffer.writeFloat(this.scale.y);
        buffer.writeInt(this.rail?this.rail.id:0);
    },
    getKeyNumber: function(models, name) {
        var i = 0;
        for (var key in models) if (models.hasOwnProperty(key)) {
            if (key == this.name) return i;
            i++;
        }
        return -1;
    },
    getKey: function(models, keyNumber) {
        var i = 0;
        for (var key in models) if (models.hasOwnProperty(key)) {
            if (i == keyNumber) return key;
            i++;
        }
        return key;
    },
    createFromBin: function(buffer, models) {
        var nameId = buffer.readInt();
        var name = nameId<0?buffer.readString():this.getKey(models, nameId);
        var modelId = buffer.readInt();
        var model = models[this.getKey(models, modelId)];
        //TODO: remove this hack
        if (name == "station1") model = models["station"];

        var position = new Point(buffer.readFloat(), buffer.readFloat());
        var scale = new Point(buffer.readFloat(), buffer.readFloat());
        var s = new FieldObject(model, position, scale, name);
        s.railId = buffer.readInt();
        return s;
    }
}

},{"./pixi/Point":18,"./pixi/Rectangle":19}],6:[function(require,module,exports){
/**
 * Created by Liza on 11.08.2015.
 */


var Rails = require('./Rails');
var Point = require('./pixi/Point');
var FieldObject = require('./FieldObject');

function GameResources(options, shapes, atlas, clusters, stations) {
    this.options = options;
    this.shapes = shapes;
    this.atlas = atlas;
    this.clusters = clusters;
    this.stations = stations;
}

module.exports = GameResources;

GameResources.prototype = {
    initModels: function () {
        if (this.models) return;
        var options = this.options;
        var atlas = this.atlas.frames;
        var models = this.models = {};
        var shapes = this.shapes;
        for (var key in shapes) if (shapes.hasOwnProperty(key)) {
            models[key] = new FieldObject(key, shapes[key]);
            models[key].model = key;
            if (atlas.hasOwnProperty(key + "b")) {
                models[key + "b"] = models[key];
            }
        }
        var rails = this.rails = new Rails(72, new Point(options.railsSize, options.railsSize * 2 / 3), 64, 2);
        if (!this.clusters) {
            var clusters = this.clusters = [];
            if (this.options.clusters != 1) {
                for (var key in shapes) if (shapes.hasOwnProperty(key)) {
                    if (key.indexOf("station") < 0 && key.indexOf("bridge") < 0 && key.indexOf("perehod") < 0 && key.indexOf("platform") < 0) {
                        var obj = {
                            main: [key]
                        }
                        if (atlas.hasOwnProperty(key + "b")) {
                            obj.main.push(key + "b");
                        }
                        clusters.push(obj);
                    }
                }
            } else {
                var trees = ["bush1", "pine1", "tree1", "tree2"];

                var rocks = ["bigrock1", "bigrock2", "smallcrag1", "smallcrag2", "smallrock1", "smallrock2", "smallrock3"];
                var big = [["crag1", "crag2", "pond1"]];

                var lst = [];
                big.forEach(function (bigStuff) {
                    var cluster = {
                        tries: 100, once: true,
                        main: bigStuff,
                        secondary: [
                            {radMin: 10, radMax: 100, count: 5, tries: 100, list: lst},
                            {radMin: 100, radMax: 200, count: 5, tries: 100, list: lst}
                        ]
                    };
                    trees.forEach(function (t) {
                        lst.push(t);
                        lst.push(t + "b");
                        lst.push(t);
                        lst.push(t + "b");
                    });
                    rocks.forEach(function (t) {
                        lst.push(t);
                    });
                    clusters.push(cluster);
                });
                for (var i = 0; i < 3; i++) {
                    var tr1 = [trees[i], trees[i] + "b"];
                    if (i == 2) {
                        tr1.push(trees[3]);
                        tr1.push(trees[3] + "b");
                    }
                    var tr2 = [];
                    tr1.forEach(function (t) {
                        tr2.push(t)
                    })
                    tr1.forEach(function (t) {
                        tr2.push(t)
                    })
                    tr1.forEach(function (t) {
                        tr2.push(t)
                    })
                    tr1.forEach(function (t) {
                        tr2.push(t)
                    })
                    rocks.forEach(function (t) {
                        tr2.push(t)
                    })
                    cluster = {
                        tries: 20,
                        main: trees, neibRadius: 100,
                        secondary: [
                            {radMin: 10, radMax: 100, count: 5, tries: 100, list: tr1},
                            {radMin: 100, radMax: 200, count: 5, tries: 100, list: tr2}
                        ]
                    };
                    clusters.push(cluster);
                }
            }
        }
        if (!this.rivers) {
            this.rivers = {
                water: [{ p: 10, list: [{ model: "river2", shiftX: 150 }] },
                    { p:1, list: [ {model: "riverbig1", shiftX: options.width - 714},
                      { model: "riverbig2", shiftX: 714 }, {model: "riverbig3", shiftY: options.height-429, shiftX: 1200}]}],
                bridges: [
                    {
                        "angle": 5,
                        "len": 100,
                        "padding": 15,
                        "base": "bridgeNE_base",
                        "top": "bridgeNE_top"
                    },
                    {
                        "angle": 7,
                        "len": 100,
                        "padding": 15,
                        "base": "bridgeSE_base",
                        "top": "bridgeSE_top"
                    },
                    {
                        "angle": 6,
                        "len": 100,
                        "padding": 15,
                        "base": "bridgeE_base",
                        "top": "bridgeE_top"
                    }
                ]
            }
        }
        if (!this.stations) {
            var stations = this.stations = [];
            stations.push({
                "angle": 6,
                "bonusRail": 200,
                "list": [
                    {"x": 0, "y": -210, "model": "station", "name": "station1"},
                    {"x": 18, "y": 20, "model": "platform", "name": "platform"},
                    //{ "x": 0, "y": -100, "model": "station"},
                    {"x": 285, "y": -110, "model": "perehod_base"},
                    {"x": 285, "y": -110, "model": "perehod_top"}
                ]
            })
            stations.push({
                "angle": 6,
                "bonusRail": 150,
                "list": [
                    {"x": 18, "y": -50, "model": "platform", "name": "station2"},
                    {"x": 18, "y": 20, "model": "platform", "name": "platform"},
                    {"x": 285, "y": -110, "model": "perehod_base"},
                    {"x": 285, "y": -110, "model": "perehod_top"}
                ]
            })
        }
        if (!this.obstacles) {
            this.obstacles = [
//                { name: "pointer_coin", duration: 0.2},
//                { name: "evacuator", duration: 1},
//                { name: "lights", duration: 1},
                {
                    prob: 1, name: "phones1", duration: 0.5, vel: 10,
                    icons: ["phones1", "phones2"], iconAnimSpeed: 1000,
                    useHorn: 400,
                    pointerIcon: "pointer3",
                    humanModels: ["man", "man_color1", "man_color2", "man_color3"]
                },
                {
                    prob: 0.5, name: "runner", duration: 0.5, vel: 3.5, walkVel: 30, state: 3,
                    icons: ["runner"]
                },
                {
                    name: "highway", duration: 0.5, betweenMin: 100, betweenMax: 150, minDistance: 50,
                    vel: 120,
                    icons: ["lights"],
                    carModels: ["car1", "car2", "car3", "car4"]
                },
                {
                    prob: 1, name: "kids", duration: 0.5, radius: 50, vel: 40, humanCount: 2,
                    icons: ["children"],
                    humanModels: ["child", "child2"]
                },
                {
                    prob: 1, name: "junk", duration: 0.5,
                    icons: ["trash"]
                },
                //several variants of stations
                {
                    name: "lights1", bindObj: "station1", duration: 0.5, humanCount: 10, railPos: 100,
                    vel: 80,
                    walkingCount: 5,
                    icons: ["lights"],
                    platforms: [
                        {x: 50, y: -30, w: 280, h: 7},
                        {x: 40, y: 35, w: 320, h: 15}
                    ],
                    ways: [
                        [{x: 340, y: -25}, {x: 340, y: 35}],
                        [{x: 345, y: 35}, {x: 345, y: -25}],
                        [{x: 370, y: -30}, {x: 462, y: -30, z: 40}, {x: 476, y: -30, z: 40},
                            {x: 476, y: 35, z: 40}, {x: 462, y: 35, z: 40}, {x: 370, y: 35}],
                        [{x: 370, y: 40}, {x: 462, y: 35, z: 40}, {x: 476, y: 35, z: 40},
                            {x: 476, y: -30, z: 40}, {x: 476, y: -30, z: 40}, {x: 370, y: -30}]
                    ],
                    humanModels: ["man", "man_color1", "man_color2", "man_color3"]
                },
                {
                    name: "lights2", bindObj: "station2", duration: 0.5, humanCount: 10, railPos: 100,
                    vel: 80,
                    walkingCount: 5,
                    icons: ["lights"],
                    platforms: [
                        {x: 50, y: -30, w: 280, h: 7},
                        {x: 40, y: 35, w: 320, h: 15}
                    ],
                    ways: [
                        [{x: 340, y: -25}, {x: 340, y: 35}],
                        [{x: 345, y: 35}, {x: 345, y: -25}],
                        [{x: 370, y: 40}, {x: 462, y: 35, z: 40}, {x: 476, y: 35, z: 40},
                            {x: 476, y: -30, z: 40}, {x: 476, y: -30, z: 40}, {x: 370, y: -30}]
                    ],
                    humanModels: ["man", "man_color1", "man_color2", "man_color3"]
                },
                {
                    prob: 100, name: "delorean", duration: 2.5, vel: 120,
                    exactPlace: 20430, maxTimes: 1, showScore: 2015,
                    icons: ["evacuator"],
                    carModels: ["delorean"]
                }
            ]
        }
    },
    toJson: function () {
        return {
            options: this.options,
            shapes: this.shapes,
            atlas: this.atlas,
            clusters: this.clusters,
            stations: this.stations,
            rivers: this.rivers,
            obstacles: this.obstacles
        }
    },
    fromJson: function (json) {
        this.options = json.options;
        this.shapes = json.shapes;
        this.atlas = json.atlas;
        this.clusters = json.clusters;
        this.stations = json.stations;
        this.rivers = json.rivers;
        this.obstacles = json.obstacles;
        this.initModels();
        return this;
    }
}

},{"./FieldObject":5,"./Rails":11,"./pixi/Point":18}],7:[function(require,module,exports){
/**
 * Created by Liza on 23.07.2015.
 */

var Point = require('./pixi/Point');
var Rectangle = require('./pixi/Rectangle');
var Rails = require('./Rails');
var Path = require('./Path');
var Builder = require('./Builder');
//var seedrandom = require('seedrandom');
var Grid = require('./Grid');
var Switch = require('./Switch');
var FieldObject = require('./FieldObject');
var AABB = require('./AABB');

module.exports = function Generator(prevBuilder, options) {
    options = options || {};

    var self = this;
    var rails = prevBuilder.rails;

    var rect = options.rect || new Rectangle(0, 0, 1200, 720);
    var rect2 = options.rect2 || new Rectangle(0, 0, 1200, 720);
    var rand = {
        quick: function () {
            return Math.random();
        }
    }
//    if (prevBuilder.paths.length == 1 && prevBuilder.paths[0].segments.length==1)
//        options.seed = Math.random() * 100000 | 0;
//    else options.seed = Math.random() * 100000 | 0;
    //var rand = new seedrandom(options.seed);
    //if (prevBuilder.paths.length == 1 && prevBuilder.paths[0].segments.length==1)
    //    console.log("seed="+options.seed);

    var endLen = options.endLen || 50;
//    var minShiftX = options.minShiftX || 100;
//    var maxShiftX = options.maxShiftX || 150;
    var shiftX = options.shiftX || Math.ceil(rails.scale.x * 25);
    var shiftY = options.shiftY || Math.ceil(rails.scale.x * 50);

    var recTries = options.recTries || 1000;
    var innerTries = options.innerTries || 2;
    var endStation = options.endStation || 0.5;
    var maxWays = options.maxWays || 3;
    var minWays = options.minWays || 2;

    var minLen = options.minLen || 0;

    var objectsCount = options.objectsCount || ( options.clusters ? 10 : 200);
    var riverProb = options.riverProb || 0.4;
    var hasRiver = Math.random() < riverProb;

    var highwayWidth, highwayProb = 0;
    if (prevBuilder.gameRes.atlas.frames['road']) {
        highwayWidth = options.highwayWidth || prevBuilder.gameRes.atlas.frames['road'].frame.w;
        highwayProb = options.highwayProb || 0.3;
    }

    //this is for intersections:
    var grid;
    if (options.intersections) {
        grid = new Grid({
            rect: rect,
            tileW: Math.ceil(rails.scale.x * 5),
            tileH: Math.ceil(rails.scale.x * 3),
            border: 2
        });
    } else
        grid = new Grid({rect: rect, tileW: Math.ceil(rails.scale.x * 7.5), tileH: Math.ceil(rails.scale.x * 5)});

    var testSegment;

    var endRects = [];

    var tryObjectsPrevRail;
    function tryObjects(objs, prevRail) {
        tryObjectsPrevRail = prevRail;
        for (var i = 0; i < objs.length; i++) {
            if (!addObject(objs[i], false, true)) {
                tryObjectsPrevRail = null;
                return false;
            }
        }
        tryObjectsPrevRail = null;
        return true;
    }

    function isEnd(path) {
        var p = path.tail().endPosition;
        var endAngle = path.tail().endAngle;
        var endLen_ = endLen;
        var bonusLen = 0;

        var rail1 = testSegment = rails.createStraight(p, endAngle, endLen, testSegment);
        var p2 = rail1.endPosition;
        var sx = p2.x - rect.x - rect.width;

        if ((sx >= 0 && sx <= shiftX) && (p2.y - rect2.y <= rect2.height - shiftY && endAngle == rails.grad * 7 / 8 ||
            p2.y - rect2.y >= shiftY && endAngle == rails.grad * 5 / 8 || endAngle == rails.grad * 6 / 8)) {
            if (build.highway) {
                //TODO: two more directions
                if (endAngle == rails.grad * 6 / 8) {
                    var tail = path.addStraight(endLen_ + highwayWidth / rails.scale.x);
                    tail.highwayPos = (rect.x + rect.width - testSegment.startPosition.x) / rails.scale.x;
                    if (addRail(tail, false, true)) {
                        //may be add object here
                        path.isEnd = [];
                        return true;
                    }
                    path.pop();
                }
            } else {
                var objs = null;
                if (canPlaceAfter && rand.quick() < endStation) {
                    objs = build.createStation(p, endAngle);
                    if (objs && objs.railLen) endLen_ = objs.railLen;
                    if (objs && objs.bonusRail) endLen_ = objs.bonusRail;
                    //if (obj == null) {
                    //    return false;
                    //}
                }
                var endRect = new AABB(new Rectangle(sx, p2.y - rails.radius / 2, rails.radius, rails.radius));
                for (var i = 0; i < endRects.length; i++) {
                    if (endRects[i].intersectRect(endRect)) {
                        return false;
                    }
                }
                if (!objs || tryObjects(objs.list, path.tail())) {
                    var tail = path.addStraight(endLen_);
                    if (addRail(tail, objs && objs.bonusRail, true)) {
                        endRects.push(endRect);
                        path.isEnd = [endRect];
                        if (objs) {//
                            tail.mapObj = objs.list[0];
                            objs.list[0].rail = tail;
                            for (var i = 0; i < objs.list.length; i++) {
                                var obj = objs.list[i];
                                path.isEnd.push(obj);
                                addObject(obj, true, false);
                            }
                        }
                        return true;
                    }
                    path.pop();
                }
            }
        }
        return false;
    }

    var sid = 0;
    var temp = new Point();
    var pos = [];

    var interRail = null;

    function addRail(rail, ignoreProblems, canGoRight, riverPadding) {
        interRail = null;
        var rail2 = rail.prev;
        if (!(rail.endPosition.x - rails.w >= rect2.x &&
            (rail.endPosition.x + rails.w <= rect2.x + rect2.width || canGoRight) &&
            rail.endPosition.y - rails.h >= rect2.y &&
            rail.endPosition.y + rails.h <= rect2.y + rect2.height)) {
            if (!ignoreProblems)
                return false;
        }
        rail.cells = [];
        rail.sid = ++sid;
        while (pos.length > 0) pos.pop();
        rail.fillPositions(pos, 3);
        for (var i = 0; i < pos.length; i += 2) {
            if (canGoRight && (pos[i] >= rect.x + rect.width)) continue;
            var cell = grid.cellAt(pos[i], pos[i + 1]);
            var pad = rail.len * i / (pos.length - 1);
            if (cell == null) {
                if (!ignoreProblems) return false;
            } else if (cell.sid != sid) {
                if (cell.border < 0) {
                    if (!ignoreProblems) return false;
                    continue;
                }
                if (!ignoreProblems && cell.contents.length > 0) {
                    if (!rail2 || rail2.cells.indexOf(cell) < 0) {
                        for (var j = 0; j < cell.contents.length; j++) {
                            var obj = cell.contents[j];
                            //oops, we have siblings!
                            if (obj.prev && obj.prev == rail2 &&
                                obj.curve != rail.curve) continue;
                            if (riverPadding && obj.river && pad >= riverPadding && pad <= rail.len - riverPadding) continue;
                            interRail = cell.contents[0];
                            return false;
                        }
                    }
                }
                cell.sid = sid;
                rail.cells.push(cell);
            }
        }
        //if (!pathExists(rail.endPosition)) return false;
        for (var i = 0; i < rail.cells.length; i++) {
            rail.cells[i].contents.push(rail);
        }
        return true;
    }

    function removeRail(rail, checkIns) {
        var path = rail.path;
        path.check(path);
        for (var i = path.waysOut.length - 1; i >= 0; i--) {
            var way = path.waysOut[i];
            if (way.railFrom == rail) {
                path.waysOut.splice(i, 1);
                if (way.pathTo.mergesTo &&
                    way.pathTo.mergesTo.pathTo == path) {
                    //DROP IT!
                    for (var j = 0; j < path.waysIn.length; j++) {
                        var way2 = path.waysIn[j];
                        if (way2.pathFrom == way.pathTo) {
                            path.waysIn.splice(j, 1);
                            break;
                        }
                    }

                    var seg = way.pathTo.segments;
                    for (var i = seg.length - 1; i >= 0; i--) {
                        removeRail(seg[i], true);
                    }
                } else {
                    path.merge(way.pathTo);
                    path.check(path);
                    if (!build.removePath(way.pathTo)) {
                        var k = build.finish.indexOf(path);
                        if (k >= 0)
                            build.finish.splice(k, 1);
                        else {
                            console.log("yes, that was the derp");
                        }
                    }
                    return;
                }
            }
        }
        path.check();
        if (rail.mapObj) {
            //remove objects (bridges)
            var obj = rail.mapObj;
            var k = build.objects.indexOf(obj);
            if (k >= 0) {
                grid.removeObject(obj);
                build.objects.splice(k, 1);
            }
        }

        //remove from cells
        for (var i = 0; i < rail.cells.length; i++) {
            var k = rail.cells[i].contents.indexOf(rail);
            if (k >= 0)
                rail.cells[i].contents.splice(k, 1);
        }
        //remove from path
        path.pop();
        if (build.canRemove(path)) {
            var head = path.head;
            //sometimes this head is ALREADY REMOVED. That's in case of circles
            var oldPath = safePath(head);
            for (var i = 0; i < oldPath.waysOut.length; i++) {
                var way = oldPath.waysOut[i];
                if (way.pathTo == path) {
                    oldPath.waysOut.splice(i, 1);
                    break;
                }
            }
            build.removePath(path);
            path.check(path);
            //remove fucking path
        }
        //add removed paths
        if (checkIns) {
            for (var i = path.waysIn.length - 1; i >= 0; i--) {
                var way = path.waysIn[i];
                if (way.railTo == rail) {
                    way.pathFrom.mergesTo = null;
                    build.finish.push(way.pathFrom);
                    //this wont be recursion, dont worry
                    removeRail(way.pathFrom.tail(), true);
                    path.waysIn.splice(i, 1);
                }
            }
            path.check(path);
        }
    }

    var q = [];

    function checkLoop(path, way) {
        while (q.length > 0) q.pop();
        q.push(way);
        for (var qcur = 0; qcur < q.length; qcur++) {
            var w = q[qcur];
            var pathTo, pos;
            if (w.rails) {
                pathTo = w;
                pos = 0;
            } else {
                pathTo = w.pathTo;
                pos = w.posTo;
            }
            if (pathTo == path) {
                return false;
            }
            for (var i = 0; i < pathTo.waysOut.length; i++) {
                var way = pathTo.waysOut[i];
                if (way.posFrom >= pos) {
                    if (q.indexOf(way.pathTo) < 0) {
                        q.push(way.pathTo);
                    }
                }
            }
            if (pathTo.mergesTo) {
                if (q.indexOf(pathTo.mergesTo) < 0)
                    q.push(pathTo.mergesTo);
            }
        }
        return true;
    }

    function addObject(obj, ignoreProblems, dontAdd) {
        obj.cells = [];
        if (!ignoreProblems && !dontAdd && !obj.liesInRect(rect))
            return false;
        var fail = grid.findIntersection(obj, function (cell) {
            if (cell.border < 0) {
                return !ignoreProblems && !dontAdd;
            }
            if (!ignoreProblems && cell.contents.length > 0) {
                for (var i=0;i<cell.contents.length;i++) {
                    if (cell.contents[i] != tryObjectsPrevRail)
                        return true;
                }
            }
            obj.cells.push(cell);
            return false;
        });
        if (fail) return false;
        if (!dontAdd) {
            for (var i = 0; i < obj.cells.length; i++) {
                obj.cells[i].contents.push(obj);
            }
            build.objects.push(obj);
        }
        return true;
    }

    var miniCounter = -1, cur = 0;

    function miniCycle() {
        if (miniCounter < 0) throw "cant do, cycle not started";
        miniCounter++;
        if (build.finish.length == 0) {
            if (build.minLength() > minLen) {
                best.push(build.clone());
                minLen = build.minLength();
            }
            endMiniCycle();
            return;
        }
        cur = (cur + 1) % build.finish.length;
        var path = build.finish[cur];
        var ends = 0;
        while (path.isEnd && ends < build.finish.length) {
            ends++;
            cur = (cur + 1) % build.finish.length;
            path = build.finish[cur];
        }
        if (ends == build.finish.length) {
            best.push(build.clone());
            minLen = build.minLength();
            if (build.finish.length > 1) {
                endMiniCycle();
                return;
            } else {
                var p = path.tail();
                p.mapObj = null;
                removeRail(path.tail(), true);
                for (var i = 0; i < path.isEnd.length; i++) {
                    var obj = path.isEnd[i];
                    var k = build.objects.indexOf(obj);
                    if (k >= 0) {
                        grid.removeObject(obj);
                        build.objects.splice(k, 1);
                    } else {
                        var k = endRects.indexOf(obj);
                        if (k >= 0)
                            endRects.splice(k, 1);
                    }
                }
                path.isEnd = null;
            }
        } else if (build.minLength() > minLen && build.finish.length >= minWays) {
//            if (rand.quick() < 0.5)
            if (isEnd(path)) {
                return;
            }
        }
        var tail = path.tail();
        //TODO: what if path can be removed?
        if (tail.tries > 0 || !path.canPop()) {
            tail.tries--;
            var r;
            if (rand.quick() >= 0.5) {
                r = path.addStraight((10 + rand.quick() * 40) | 0 * rails.h);
            } else {
                var sgn = rand.quick() >= 0.5 ? 1 : -1;
                r = path.addCurve(sgn * rails.grad / 8 * ((rand.quick() * 2 | 0) + 1));
            }
            if (!addRail(r)) {
                path.pop();
                //try river or intersection
                if (interRail != null && interRail.river && r.curve == 0) {
                    var rivers = build.gameRes.rivers;
                    var b = null;
                    for (var i = 0; i < rivers.bridges.length; i++) {
                        if (rivers.bridges[i].angle * rails.grad / 8 == r.startAngle) {
                            b = rivers.bridges[i];
                            break;
                        }
                    }
                    if (b) {
                        r = path.addStraight(b.len);
                        if (!addRail(r, false, false, b.padding)) {
                            path.pop();
                        } else {
                            placeBridge(r, b);
                        }
                    }
                } else if (interRail != null && interRail.path &&
                    interRail.path != path &&
                    testParent(tail, interRail) &&
                    build.finish.length > minWays) {
                    tryIntersect(path, interRail);
                }
            } else {
                r.tries = innerTries;
                if (build.finish.length < maxWays && (build.finish.length < minWays || rand.quick() < 0.2))
                    tryClone(path, tail);
            }
        } else {
            removeRail(tail, true);
        }
    }

    function placeBridge(r, b) {
        var rivers = build.gameRes.rivers;
        if (!b) {
            for (var i = 0; i < rivers.bridges.length; i++) {
                if (rivers.bridges[i].angle * rails.grad / 8 == r.startAngle) {
                    b = rivers.bridges[i];
                    break;
                }
            }
        }
        if (!b) return false;
        var p = r.pointAt(b.len / 2);
        var bm = build.gameRes.models[b.base];
        p.x -= 189 * 0.9;
        p.y -= 189 * 0.9;
        r.mapObj = new FieldObject(build.gameRes.models[b.base], p, new Point(0.9, 0.9));
        r.tries = innerTries;
        addObject(r.mapObj, true);
        return r.mapObj;
    }

    function testParent(rail1, rail2) {
        if (!rail2) return true;
        rail2 = rail2.prev;
        if (rail2 == rail1) return false;
        if (!rail2) return true;
        rail2 = rail2.prev;
        if (rail2 == rail1) return false;
        return true;
    }

    function tryClone(path, rail) {
        var newPath = new Path().init2(path, rail, 0);
        var sgn = rand.quick() >= 0.5 ? 1 : -1;
        var r2 = newPath.addCurve(sgn * rails.grad / 8 * ((rand.quick() * 2 | 0) + 1));
        r2.tries = innerTries;
        if (addRail(r2, false, false)) {
            var way = new Switch().init(path, rail, rail.pos - path.head.pos, newPath, r2, 0);
            path.waysOut.push(way);
            build.addPath(newPath);
        } else {
            newPath.pop();
            /*if (interRail != null && interRail.path && testParent(rail, interRail)) {
             var way = new Switch().init(path, rail, rail.pos - path.head.pos, newPath, rail, 0);
             path.waysOut.push(way);
             //build.addPath(newPath);
             //YEAH, lets try to remove this path
             if (tryIntersect(newPath, interRail)) {
             way.railTo = newPath.segments[0];
             build.addPath(newPath);
             } else
             path.waysOut.pop();
             }*/
        }
    }//

    function safePath(railTo) {
        var pathTo = railTo.path;
        if (!pathTo) return false;
        if (build.paths.indexOf(pathTo) < 0) {
            for (var i = 0; i < build.paths.length; i++) {
                if (build.paths[i].head == railTo) {
                    return build.paths[i];
                }
            }
            return false;
        }
        return pathTo;
    }

    var eps = 1e-2;

    function tryIntersect(pathFrom, railTo) {
        if (railTo.mapObj != null) return false;
        var pathTo = safePath(railTo);
        if (!pathTo) return false;
        var tail = pathFrom.tail();
        var ang1 = tail.endAngle;
        var tries = [];

        if (railTo.curve == 0)
            tries.push(railTo);
        var seg = pathTo.segments;
        if (seg.length > railTo.pathIndex + 1) {
            var r2 = seg[railTo.pathIndex + 1];
            if (r2.curve == 0 && !r2.mapObj)
                tries.push(r2);
        }
        var cosa = Math.cos(rails.angles[ang1]), sina = Math.sin(rails.angles[ang1]);

        for (var t = 0; t < tries.length; t++) {
            railTo = tries[t];
            var ang2 = railTo.endAngle;
            var delta = ang2 - ang1;
            if (delta > rails.grad / 2)
                delta -= rails.grad;
            if (delta <= -rails.grad / 2)
                delta += rails.grad;
            if (delta != 0 && delta != rails.grad / 2) {
                var r = pathFrom.addCurve(delta);
                var p1 = r.endPosition;
                var p2 = railTo.startPosition;
                var dx = (p1.x - p2.x) / rails.scale.x;
                var dy = (p1.y - p2.y) / rails.scale.y;

                var cosb = Math.cos(rails.angles[ang2]), sinb = Math.sin(rails.angles[ang2]);

                pathFrom.pop();
                var len0 = cosb * dx + sinb * dy;
                var len1 = len0 / (sina * cosb - cosa * sinb);
                var len2 = -sinb * (dx - sina * len1) + cosb * (dy + cosa * len1);
                if (len1 >= 0 && len2 >= 0 && len2 <= railTo.len) {
                    var way = new Switch().init(pathFrom, tail, tail.pos - pathFrom.head.pos, pathTo, railTo,
                        len2 + (railTo.pos - railTo.len - pathTo.head.pos));
                    if (!checkLoop(pathFrom, way)) continue;
                    if (len1 > eps) {
                        var endRail0 = pathFrom.addStraight(len1);
                        endRail0.tries = 0;
                        if (!addRail(endRail0)) {
                            pathFrom.pop();
                            continue;
                        }
                    }
                    var endRail = pathFrom.addCurve(delta);
                    addRail(endRail, true);//
                    way.posFrom = endRail.pos - pathFrom.head.pos;
                    way.railFrom = endRail;
                    var k = build.finish.indexOf(pathFrom);
                    if (k >= 0) build.finish.splice(k, 1);
                    pathFrom.mergesTo = way;
                    pathTo.waysIn.push(way);
                    //TODO: close it!
                    return true;
                }
            }
        }
        return false;
    }

    var canPlaceAfter = false;
    function placeRiver() {
        var prevRiver = prevBuilder.objects[0];
        var r1 = prevRiver ? prevRiver.name : "";
        var r = build.gameRes.rivers;
        if (r1.substring(0, 5) == "river") {
            var s = 0;
            for (var i = 0; i < r.water.length; i++) {
                for (var j = 0; j + 1 < r.water[i].list.length; j++)
                    if (r.water[i].list[j].model == r1) {
                        s = r.water[i].list[j + 1];
                    }
            }
            if (s) {
                var obj = new FieldObject(build.gameRes.models[s.model], new Point(prevRiver.position.x + s.shiftX, s.shiftY || 0), new Point(1, 1));
                addObject(obj, true);
                obj.cells.forEach(function(cell) {
                    cell.contents.forEach(function(rail) {
                        if (!rail.path) return;
                        if (rail.mapObj) return;
                        placeBridge(rail);
                    });
                });

                obj.river = true;
                return obj;
            }
        }
        if (!hasRiver) return false;
        var sum = 0;
        for (var i=0;i< r.water.length;i++) {
            sum += r.water[i].p;
        }
        var tt = Math.random() * sum | 0;
        var ind = 0;
        while (tt>= r.water[ind].p) {
            tt-= r.water[ind++].p;
        }
        var s = r.water[ind].list[0];
        var obj = new FieldObject(build.gameRes.models[s.model], new Point(rect.x + (s.shiftX || 0), s.shiftY || 0), new Point(1, 1));
        if (addObject(obj, false, true)) {
            addObject(obj, true);
            obj.river = true;
            return obj;
        }
        return false;
    }

    function beginMiniCycle() {
        self.tries++;
        build.clear();
        grid.clear();
        build.addToGrid(grid);
        var river = placeRiver();
        canPlaceAfter = (!river || river.getBounds().x + river.getBounds().width < rect.x + rect.width);
        build.highway = (canPlaceAfter && Math.random() < highwayProb) ? (rect.x + rect.width) : 0;
        while (endRects.length > 0) endRects.pop();
        miniCounter = 0;
    }

    function endMiniCycle() {
        miniCounter = -1;
    }

    function cycle() {
        beginMiniCycle();
        for (var tr = 0; tr < recTries && miniCounter >= 0; tr++) {
            miniCycle();
        }
        endMiniCycle();
    }

    var best = [];
    var objects;
    var build = new Builder();
    build.init2(prevBuilder, rect);

    self.tries = 0;

    this.doIt = function (tries, tryUntilSuccess) {
        var dt = Date.now();
        var tr;
        for (tr = 0; self.tries < tries || tryUntilSuccess && best.length == 0; tr++) {
            cycle();
        }
        dt = Date.now() - dt;
        if (tr > 1)
            console.log("generation " + tr + " tries, " + dt + " ms");
    }

    this.doIt2 = function (counter) {
        for (var i = 0; i < counter; i++) {
            if (miniCounter < 0 || miniCounter >= recTries) beginMiniCycle();
            miniCycle();
        }
    }


    this.resetIfNoWay = function () {
        self.tries = 0;
        self.best = [];
        endMiniCycle();
    }

    this.finish = function () {
        if (best.length == 0) return false;
        var dt = Date.now();

        //popping best variant
        var TEMP = build;
        endMiniCycle();
        var RES = build = best.pop();
        while (best.length > 0 && best[best.length - 1].minLength() > minLen - 5) best.pop();
        minLen = best.length > 0 ? best[best.length - 1].minLength() : 0;

        build.shiftX = rect.x + rect.width;
        grid.clear();
        for (var i = 0; i < build.finish.length; i++) {
            var tail = build.finish[i].tail();
            var endAngle = tail.endAngle;
            build.shiftX = Math.min(build.shiftX, Math.round(tail.startPosition.x));
        }
        if (build.highway) {
            build.shiftX = rect.x + rect.width + highwayWidth;
        }
        var bshiftX = Math.min(build.shiftX, rect.x + rect.width);
        build.addToGrid(grid);
        var clusters = build.gameRes.clusters;
        var models = build.gameRes.models;

        var roster = [];
        for (var i = 0; i < clusters.length; i++) roster.push(clusters[i]);
        if (roster.length > 0)
            roster.splice(Math.random() * roster.length | 0, 1);
        for (var i = 0; i < objectsCount; i++) {
            var cluster = roster[rand.quick() * roster.length | 0];
            var modelName = cluster.main[rand.quick() * cluster.main.length | 0];
            var model = models[modelName];
            var p = null;
            var tr = cluster.tries || 10;
            cycle1:for (var j = 0; j < tr; j++) {
                //var scale = rand.quick() * 0.05 + 0.3;
                var scale = model.density || 1;
                var p1 = new Point(rand.quick() * (bshiftX - rect.x) + rect.x,
                    rand.quick() * rect.height + rect.y);
                var p2 = new Point(Math.round(p1.x - model.anchor.x * scale), Math.round(p1.y - model.anchor.y * scale));

                if (cluster.neibRadius) {
                    for (var i = 0; i < build.objects.length; i++) {
                        if (build.objects[i].name == modelName) {
                            var dx = build.objects[i].position.x - p2.x;
                            var dy = build.objects[i].position.y - p2.y;
                            if (dx * dx + dy * dy < cluster.neibRadius * cluster.neibRadius) continue cycle1;
                        }
                    }
                }
                var obj = new FieldObject(model, p2, new Point(scale, scale));
                if (addObject(obj)) {
                    obj.name = modelName;
                    p = p1;
                    break;
                }
            }
            if (!p || !cluster.secondary) continue;
            if (cluster.once) {
                roster.splice(roster.indexOf(cluster), 1);
            }
            //place cluster!
            for (var i = 0; i < cluster.secondary.length; i++) {
                var total = 0;
                var s = cluster.secondary[i];
                for (var tr = 0; tr < s.tries && total < s.count; tr++) {
                    var modelName2 = s.list[rand.quick() * s.list.length | 0];
                    var model2 = models[modelName2];
                    var scale = model2.density || 1;

                    var r = Math.random() * (s.radMax - s.radMin) + s.radMin;
                    var alpha = Math.random() * Math.PI * 2;

                    var p1 = new Point(p.x + Math.cos(alpha) * r, p.y + Math.sin(alpha) * r);
                    var p2 = new Point(Math.round(p1.x - model2.anchor.x * scale), Math.round(p1.y - model2.anchor.y * scale));
                    var obj = new FieldObject(model2, p2, new Point(scale, scale));
                    if (addObject(obj)) {
                        obj.name = modelName2;
                        total++;
                    }
                }
            }
        }
        build.initLinkedList();
        dt = Date.now() - dt;
        console.log("generation objects " + dt + " ms");
        build = TEMP;
        return RES;
    }
};

},{"./AABB":2,"./Builder":4,"./FieldObject":5,"./Grid":8,"./Path":10,"./Rails":11,"./Switch":13,"./pixi/Point":18,"./pixi/Rectangle":19}],8:[function(require,module,exports){
var Point = require('./pixi/Point');
var Rectangle = require('./pixi/Rectangle');

function Cell(row, col, border, rect) {
    this.row = row;
    this.col = col;
    this.border = border;
    this.rect = rect;
    this.sid = 0;
    this.contents = [];
}

//random placing function
function Grid(options) {
    this.tileW = options.tileW || 32;
    this.tileH = options.tileH || 32;
    var rect = this.rect = options.rect || new Rectangle(0, 0, 1280, 720);
    this.border = options.border || 1;

    this.w = Math.ceil(rect.width / this.tileW) + 2 * this.border;
    this.h = Math.ceil(rect.height / this.tileH) + 2 * this.border;

    this.grid = [];
    for (var j = 0; j < this.h; j++) {
        var row = [];
        for (var i=0; i < this.w; i++) {
            var ii = i - this.border, jj = j - this.border;
            row.push(new Cell(jj, ii, Math.min(Math.min(ii, this.w - this.border - i-1), Math.min(jj, this.h - this.border - j-1)),
                new Rectangle(ii*this.tileW + rect.x, jj*this.tileH + rect.y, this.tileW, this.tileH)));
        }
        this.grid.push(row);
    }
}

Grid.prototype = {
    cellAt : function(x, y) {
        x -= this.rect.x;
        y -= this.rect.y;
        x = Math.floor(x / this.tileW) + this.border;
        y = Math.floor(y / this.tileH) + this.border;
        if (x<0 || x>=this.w || y<0 || y>=this.h)
            return null;
        return this.grid[y][x];
    },
    addObject: function(obj) {
        obj.cells = [];
        this.findIntersection(obj, function(cell) {
            if (cell.border>=0) {
                cell.contents.push(obj);
                obj.cells.push(cell);
            }
            return false;
        })
    },
    removeObject: function(obj) {
        this.findIntersection(obj, function(cell) {
            if (cell.border>=0) {
                var k = cell.contents.indexOf(obj);
                if (k>=0)
                    cell.contents.splice(k, 1);
            }
            return false;
        })
    },
    clear: function() {
        var grid = this.grid;
        for (var i=0;i<grid.length;i++)
            for (var j=0;j<grid[i].length;j++) {
                var cell = grid[i][j];
                while (cell.contents.length>0)
                    cell.contents.pop();
            }
    },
    findIntersection: function(obj, callback) {
        var bounds = obj.getBounds(), rect = this.rect;
        var i1 = Math.floor((bounds.x - rect.x) / this.tileW);
        var i2 = Math.ceil((bounds.x - rect.x+ bounds.width ) / this.tileW);
        var j1 = Math.floor((bounds.y - rect.y) / this.tileH);
        var j2 = Math.ceil((bounds.y - rect.y + bounds.height) / this.tileH);
        i1+=this.border;
        j1+=this.border;
        if (i1<0) i1 = 0;
        if (i2>=this.w) i2 = this.w-1;
        if (j1<0) j1 = 0;
        if (j2>=this.h) j2 = this.h-1;
        for (var i=i1;i<=i2;i++)
            for (var j=j1;j<=j2;j++) {
                var cell = this.grid[j][i];
                if (obj.intersectRect(cell.rect))
                    if (callback) {
                        var cb = callback(cell);
                        if (cb) return cb;
                    } else {
                        if (cell.contents.length>0 || cell.border<0)
                            return true;
                    }
            }
        return false;
    }
    /*
     //TODO: move into grid
     var q = [], id = 0;
     var dx = [1, 0, -1, 0], dy = [0, 1, 0, -1];
     function pathExists(p) {
     id++;
     var start = grid2.cellAt(p.x, p.y);
     var end = grid2.cellAt(endPos.x, endPos.y);
     while (q.length>0) q.pop();
     q.push(start);
     start.pid = id;
     for (var i=0;i< q.length;i++) {
     var cell = q[i];
     if (cell == end) return true;
     if (cell.border<0) continue;
     for (var j=0;j<4;j++) {
     var row2 = cell.row  + dx[j];
     var col2 = cell.col  + dy[j];
     var next = grid2.grid[row2 + grid2.border][col2 + grid2.border];
     if (next.pid == id || next.border<0 || next.contents.length>0)
     continue;
     if (next == end) return true;
     next.pid = id;
     q.push(next);
     }
     }
     return false;
     }*/
}

module.exports = Grid;

},{"./pixi/Point":18,"./pixi/Rectangle":19}],9:[function(require,module,exports){
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

},{"./Builder":4,"./FieldObject":5,"./Generator":7,"./Path":10,"./Rails":11,"./pixi/Point":18,"./pixi/Rectangle":19}],10:[function(require,module,exports){
var Point = require('./pixi/Point');
var Rails = require('./Rails');
var Segment = require('./Segment');
var Switch = require('./Switch');
var FieldObject = require('./FieldObject');

function Path() {
    this.segments = [];
    this.waysIn = [];
    this.waysOut = [];
};

Path.prototype = {
    id: 0,
    length: 0,
    headPos: 0,
    rails: null,
    head: null,
    mergesTo: null,
    segPool: [],
    isStart: function() {
        return this.head.path == this;
    },
    clear: function() {
        var seg = this.segments;
        while (seg.length>0) seg.pop();
        if (this.head && this.head.path == this) {
            this.length = this.head.len;
        } else
            this.length = 0;
        this.isEnd = null;
        this.mergesTo = null;
        while (this.waysIn.length>0)
            this.waysIn.pop();
        while (this.waysOut.length>0)
            this.waysOut.pop();
    },
    cutHead: function() {
        if (this.head.path == this) return;
        this.head.path = this;
        this.head.prev = null;
        this.segments.unshift(this.head);
        this.length += this.head.len;
    },
    tail: function(index) {
        var ind = this.segments.length-1-(index|0);
        return ind>=0 ? this.segments[ind]: this.head;
    },
    init1: function(rails, startPosition, startAngle, startLen) {
        this.id = ++rails.incrementId;
        var seg = this.segments;
        while (seg.length>0) seg.pop();
        this.clear();
        this.rails = rails;
        this.head = rails.createStraight(startPosition, startAngle, startLen || rails.h, this.segPool.length > 0 ? this.segPool.pop() : null);
        this.head.path = this;
        seg.push(this.head);
        this.length = this.head.len;
        return this;
    },
    check: function() {
       /* for (var i=0;i<this.waysOut.length;i++) {
            var way = this.waysOut[i];
            if (way.railFrom.endPosition.x != way.railTo.startPosition.x) {
                console.log("derping");
            }
        }*/
    },
    init2: function(prevPath, rail, pos) {
        var seg = this.segments;
        while (seg.length>0) seg.pop();
        this.head = rail || prevPath.tail();
        this.headPos = pos || 0;
        this.rails = prevPath.rails;
        this.id = ++this.rails.incrementId;
        return this;
    },
    add: function(rail) {
        var seg = this.segments;
        rail.prev = this.tail();
        rail.path = this;
        rail.pathIndex = seg.length;
        rail.pos = rail.prev.pos + rail.len;
        this.length += rail.len;
        seg.push(rail);
    },
    addCurve: function(angle) {
        var tail = this.tail();
        var r = this.rails.createCurve(tail.endPosition, tail.endAngle, angle, this.segPool.length>0?this.segPool.pop(): null);
        this.add(r);
        return r;
    },
    addStraight: function(segments) {
        var tail = this.tail();
        var r = this.rails.createStraight(tail.endPosition, tail.endAngle, segments, this.segPool.length>0?this.segPool.pop(): null);
        this.add(r);
        return r;
    },
    pop: function() {
        var tail = this.segments.pop();
        this.length -= tail.len;
        tail.init(null);
        this.segPool.push(tail);
    },
    canPop: function() {
        return this.segments.length > 1 || this.segments.length == 1 && !this.isStart();
    },
    clone: function() {
        var b = new Path();
        b.id = this.id;
        b.rails = this.rails;
        var seg = this.segments;
        for (var i=0;i<seg.length;i++) {
            var segment = seg[i].clone();
            segment.path = b;
            b.segments.push(segment);
        }
        b.head = this.isStart()? b.segments[0]: this.head;
        for (var i=0;i<this.waysIn.length;i++) {
            var oldWay = this.waysIn[i];
            var newWay = oldWay.clone();
            newWay.pathTo = b;
            //newWay.railTo = b.segments[oldWay.railTo.pathIndex];
            b.waysIn.push(newWay);
        }
        for (var i=0;i<this.waysOut.length;i++) {
            var oldWay = this.waysOut[i];
            var newWay = oldWay.clone();
            newWay.pathFrom = b;
            //newWay.railFrom = b.segments[oldWay.railFrom.pathIndex];
            b.waysOut.push(newWay);
        }
        return b;
    },
    merge: function(path) {
        var tail = this.tail();
        var seg = path.segments;
        for (var i=0;i<seg.length;i++)
            this.add(seg[i]);
        var ins = path.waysIn;
        for (var i=0;i<ins.length;i++) {
            var way = ins[i];
            way.posTo += tail.pos - this.head.pos;
            way.pathTo = this;
            this.waysIn.push(way);
        }
        var outs = path.waysOut;
        for (var i=0;i<outs.length;i++) {
            var way = outs[i];
            way.pathFrom = this;
            way.posFrom += tail.pos - this.head.pos;
            this.waysOut.push(way);
        }
        this.isEnd = path.isEnd;
        if (path.mergesTo) {
            this.mergesTo = path.mergesTo;
            this.mergesTo.pathFrom = this;
        }
    },
    toJson: function() {
        return {
            id: this.id,
            waysIn: this.waysIn.map(toJson),
            waysOut: this.waysOut.map(toJson),
            segments: this.segments.map(toJson),
            head: this.head.id
        }
    },
    fromJson: function(json, rails) {
        var self = this;
        this.rails = rails;
        this.id = json.id;
        this.head = json.head;
        this.waysIn = json.waysIn.map(switchReader);
        this.waysOut = json.waysOut.map(switchReader);
        this.segments = json.segments.map(function(obj) { return new Segment().fromJson(obj, self); });
        return this;
    },
    fromJsonStep2: function(segments, paths) {
        this.head = segments[this.head];
        for (var i=0;i<this.waysIn.length;i++) {
            var way = this.waysIn[i];
            way.pathFrom = paths[way.pathFrom];
            way.railFrom = segments[way.railFrom];
            way.pathTo = paths[way.pathTo];
            way.railTo = segments[way.railTo];
        }
        for (var i=0;i<this.waysOut.length;i++) {
            var way = this.waysOut[i];
            way.pathFrom = paths[way.pathFrom];
            way.railFrom = segments[way.railFrom];
            way.pathTo = paths[way.pathTo];
            way.railTo = segments[way.railTo];
        }
    },
    saveBin: function(buffer) {
        var save = function(x){x.saveBin(buffer);};
        buffer.writeInt(this.id);
        buffer.writeInt(this.head.id);
        buffer.writeInt(this.segments.length);
        this.segments.forEach(save);
        buffer.writeInt(this.waysIn.length);
        this.waysIn.forEach(save);
        buffer.writeInt(this.waysOut.length);
        this.waysOut.forEach(save);
    },
    loadBin: function(buffer) {
        this.id = buffer.readInt();
        this.head = buffer.readInt();
        for (var i=buffer.readInt();i>0;i--) this.segments.push(new Segment().loadBin(buffer, this));
        for (var i=buffer.readInt();i>0;i--) this.waysIn.push(new Switch().loadBin(buffer, this));
        for (var i=buffer.readInt();i>0;i--) this.waysOut.push(new Switch().loadBin(buffer, this));
        return this;
    }
};

var toJson = function(obj) {return obj.toJson(); };
var switchReader = function(obj) { return new Switch().copy(obj) }

module.exports = Path;

},{"./FieldObject":5,"./Rails":11,"./Segment":12,"./Switch":13,"./pixi/Point":18}],11:[function(require,module,exports){
/**
 * Created by Liza on 20.07.2015.
 */
var Point = require('./pixi/Point');
var Rectangle = require('./pixi/Rectangle');
var FieldObject = require('./FieldObject');
var Segment = require('./Segment');

function Rails(radius, scale, grad, w, h) {
    if (radius) this.init(radius, scale, grad, w, h);
}

Rails.prototype = {
    init: function(radius, scale, grad, w, h) {
        //for visual representation: collection of resource names, anchor points and scales
        this.radius = radius = radius || 72;
        this.grad = grad = grad || 8;
        this.w = w || 3;
        this.h = h || (radius * Math.PI * 2 / grad);
        this.rr = [radius, radius - w, radius + w, radius -w*2, radius + w*2];
        this.scale = scale = scale || new Point(1, 2/3);
        this.angles = [];
        //равномерная сетка, но можно сделать свою
        for (var i=0;i<grad;i++) {
            var a = i / grad * 2 * Math.PI;
            //this.angles.push(180 / Math.PI * Math.atan2(Math.sin(a) * scale.y / scale.x, Math.cos(a)));
            this.angles.push(a);
        }
        this.visuals = {};

        this.radii = [];
        for (var j=0; j<this.rr.length;j++) {
            this.radii.push([]);
        }
        for (var i=0;i<grad;i++) {
            var ang = this.angles[i];
            var cosa = Math.cos(ang);
            var sina = Math.sin(ang);
            for (var j=0;j<this.rr.length;j++) {
                var r = this.rr[j];
                this.radii[j].push(this.roundPoint(r * cosa, r * sina));
            }
        }
    },
    incrementId: 0,
    roundPoint: function(x, y) {
        //return new Point(Math.round(x * this.scale.x), Math.round(y * this.scale.y));
        return new Point(x * this.scale.x, y * this.scale.y);
    },
    createStraight: function(startPosition, startAngle, len, seg) {
        seg = seg || new Segment();
        seg.init(this);

        var scale = this.scale;
        seg.segmentCount = Math.round(len / this.h);
        seg.curve = 0;
        if (seg.segmentCount<1) seg.segmentCount = 1;
        var ang = (this.angles[startAngle] + Math.PI/2) ;
        var cosa = Math.cos(ang);
        var sina = Math.sin(ang);
        seg.startPosition.x = startPosition.x;
        seg.startPosition.y = startPosition.y;
        seg.startAngle = startAngle;
        seg.endPosition.x = startPosition.x + len * cosa * scale.x;
        seg.endPosition.y = startPosition.y + len * sina * scale.y;
        seg.endAngle = startAngle;
        seg.pos = seg.len = len;
        seg.id = ++this.incrementId;
        return seg;
    },
    createCurve: function(startPosition, startAngle, deltaAngle, seg) {
        seg = seg || new Segment();
        seg.init(this);

        var scale = this.scale;
        seg.startAngle = startAngle;
        var endAngle = seg.endAngle = (startAngle + deltaAngle + this.grad) % this.grad;
        var curve = seg.curve = deltaAngle>0?1:-1;
        if (deltaAngle == 0) throw "curve deltaAngle must != 0";
        seg.centerPosition.x = startPosition.x - this.radii[0][startAngle].x * curve;
        seg.centerPosition.y = startPosition.y - this.radii[0][startAngle].y * curve;
        seg.startPosition.x = startPosition.x;
        seg.startPosition.y = startPosition.y;
        seg.endPosition.x = startPosition.x - (this.radii[0][startAngle].x - this.radii[0][endAngle].x) * curve;
        seg.endPosition.y = startPosition.y - (this.radii[0][startAngle].y - this.radii[0][endAngle].y) * curve;
        seg.segmentCount = Math.abs(deltaAngle);
        var tt = this.angles[endAngle] - this.angles[startAngle];
        if (curve<0) tt = -tt;
        if (tt<0) tt+=2 * Math.PI;
        seg.pos = seg.len = this.radius * tt;
        seg.id = ++this.incrementId;
        return seg;
    },
    addVisualStroke: function(obj) {
        this.visuals["stroke"] = obj;
    },
    toJson: function() {
        return {
            radius: this.radius,
            scale: this.scale,
            grad: this.grad,
            w: this.w,
            h: this.h
        }
    },
    fromJson: function(json) {
        this.init(json.radius, json.scale, json.grad, json.w, json.h);
        return this;
    }
};

module.exports = Rails;

},{"./FieldObject":5,"./Segment":12,"./pixi/Point":18,"./pixi/Rectangle":19}],12:[function(require,module,exports){
/**
 * Created by Liza on 02.08.2015.
 */

var Point = require('./pixi/Point');
var Rectangle = require('./pixi/Rectangle');

function Segment() {
    this.centerPosition = new Point();
    this.startPosition = new Point();
    this.endPosition = new Point();
}

var temp = new Point(), temp2 = new Point();
module.exports = Segment;

Segment.prototype = {
    id: 0,
    curve: 0,
    len: 0,
    segmentCount: 0,
    rails: 0,
    prev: 0,
    next: 0,
    nextPos: 0,
    centerPosition: new Point(),
    startPosition: new Point(),
    endPosition: new Point(),
    startAngle: 0,
    endAngle: 0,
    isEnd : false,
    highwayPos: 0,
    init: function(rails) {
        this.rails = rails;
        this.positions = null;
        this.bounds = null;
        this.cells = null;
        this.prev = null;
        this.pos = 0;

        this.path = null;
        this.pathIndex = 0;
        this.nextPos = 0;
        this.next = null;
        this.isEnd = false;
        this.mapObj = null;
        this.highwayPos = 0;
    },
    copy: function(seg) {
        this.init(seg.rails);
        this.centerPosition.x = seg.centerPosition.x;
        this.centerPosition.y = seg.centerPosition.y;
        this.startPosition.x = seg.startPosition.x;
        this.startPosition.y = seg.startPosition.y;
        this.endPosition.x = seg.endPosition.x;
        this.endPosition.y = seg.endPosition.y;
        this.len = seg.len;
        this.curve = seg.curve;
        this.segmentCount = seg.segmentCount;
        this.startAngle = seg.startAngle;
        this.endAngle = seg.endAngle;
        this.id = seg.id;
        this.pos = seg.pos;
        this.mapObj = seg.mapObj;
        this.highwayPos = seg.highwayPos;

    },
    clone: function(seg) {
        var seg = new Segment();
        seg.copy(this);
        return seg;
    },
    isTangent: function() {
        return this.curve != 0;
    },
    pointAt: function(param, p3) {
        var rails = this.rails;
        p3 = p3 || new Point();
        var radius = rails.radius, scale = rails.scale;
        if (param<0) param = 0;
        if (param > this.len) param = this.len;
        var s = param / this.len;
        if (this.curve == 0) {
            //straight
            var p1 = this.startPosition, p2 = this.endPosition;
            p3.x = p1.x + (p2.x-p1.x) * s;
            p3.y = p1.y + (p2.y-p1.y) * s;
            return p3;
        } else {
            var p = this.centerPosition;
            var ang = rails.angles[this.startAngle] + this.curve * (param / radius);
            if (this.curve<0) ang += Math.PI;
            p3.x = p.x + Math.cos(ang) * radius * scale.x;
            p3.y = p.y + Math.sin(ang) * radius * scale.y;
            return p3;
        }
    },
    pointAtRail: function(param, num, p3) {
        p3 = p3 || new Point();
        if (param<0) param = 0;
        if (param > this.len) param = this.len;
        var s = param / this.len;
        var seg = this.segmentCount * s | 0;
        if (seg >= this.segmentCount) seg = this.segmentCount - 1;
        var s2 = this.segmentCount * s - seg;
        this.getPoint(num, seg, temp);
        this.getPoint(num, seg+1, temp2);
        p3.x = temp.x * (1-s2) + temp2.x * s2;
        p3.y = temp.y * (1-s2) + temp2.y * s2;
        return p3;
    },
    fillPositions: function(pos, startFrom) {
        startFrom = startFrom || 0;
        var startAngle = this.startAngle;
        var startPosition = this.startPosition;
        var centerPosition = this.centerPosition;
        var len = this.len;
        var segmentCount = this.segmentCount;
        var rails = this.rails;
        var scale = rails.scale;
        var radii = rails.radii;
        var grad = rails.grad;
        var curve = this.curve;
        if (curve==0) {
            var ang = (rails.angles[startAngle] + Math.PI/2);
            var cosa = Math.cos(ang);
            var sina = Math.sin(ang);
            for (var j=startFrom;j<5;j++) {
                var sx = startPosition.x - radii[0][startAngle].x + radii[j][startAngle].x;
                var sy = startPosition.y - radii[0][startAngle].y + radii[j][startAngle].y;
                var dx = len / segmentCount * cosa * scale.x;
                var dy = len / segmentCount * sina * scale.y;
                for (var i=0;i<=segmentCount;i++) {
                    pos.push(sx);
                    pos.push(sy);
                    sx += dx;
                    sy += dy;
                }
            }
        } else {
            for (var j=startFrom;j<5;j++) {
                var sx = centerPosition.x;
                var sy = centerPosition.y;
                var jj = j;
                if (curve<0 && j>0) {
                    if (j%2==1) jj++;
                    else jj--;
                }
                for (var i=0;i<=segmentCount;i++) {
                    var ang = (startAngle + i * curve + grad*7/4 + curve * grad/4) % grad;
                    pos.push(sx + radii[jj][ang].x);
                    pos.push(sy + radii[jj][ang].y);
                }
            }
        }
        return pos;
    },
    getPoint : function(ind1, ind2, point) {
        if (!this.positions) {
            this.positions = this.fillPositions([]);
        }
        point.x = this.positions[(ind1*(this.segmentCount+1) + ind2)*2];
        point.y = this.positions[(ind1*(this.segmentCount+1) + ind2)*2+1];
    },
    calcBounds: function() {
        if (!this.bounds) this.bounds = new Rectangle();
        var p = this.startPosition;
        var minX = p.x, maxX = p.x, minY = p.y, maxY = p.y;
        var segmentCount = this.segmentCount;
        var pos = this.positions;
        for (var j=3; j<5; j++)
            for (var i = segmentCount; i>=0; i--) {
                this.getPoint(j, i, temp);
                minX = Math.min(minX, temp.x);
                maxX = Math.max(maxX, temp.x);
                minY = Math.min(minY, temp.y);
                maxY = Math.max(maxY, temp.y);
            }
        var bounds = this.bounds;
        bounds.x = minX;
        bounds.y = minY;
        bounds.width = maxX - minX;
        bounds.height = maxY - minY;
    },
    getBounds: function() {
        if (!this.bounds) {
            this.calcBounds();
        }
        return this.bounds;
    },
    intersectRect: function(rect) {
        var segmentCount = this.segmentCount;
        for (var j=3; j<5; j++)
            for (var i = segmentCount; i>=0; i--) {
                this.getPoint(j, i, temp);
                if (rect.contains(temp.x, temp.y))
                    return true;
            }
        return false;
    },
    liesInRect: function(rect) {
        var segmentCount = this.segmentCount;
        for (var j=3; j<5; j++)
            for (var i = segmentCount; i>=0; i--) {
                this.getPoint(j, i, temp);
                if (!rect.contains(temp.x, temp.y))
                    return false;
            }
        return true;
    },
    toJson: function() {
        return [ this.id, this.centerPosition.x, this.centerPosition.y, this.startPosition.x, this.startPosition.y,
            this.endPosition.x, this.endPosition.y, this.len, this.curve, this.segmentCount, this.startAngle, this.endAngle, this.pos,
            this.highwayPos];
    },
    fromJson: function(json, path) {
        this.init(path.rails);
        this.path = path;
        this.id = json[0];
        this.centerPosition.x = json[1];
        this.centerPosition.y = json[2];
        this.startPosition.x = json[3];
        this.startPosition.y = json[4];
        this.endPosition.x = json[5];
        this.endPosition.y = json[6];
        this.len = json[7];
        this.curve = json[8];
        this.segmentCount = json[9];
        this.startAngle = json[10];
        this.endAngle = json[11];
        this.pos = json[12];
        this.highwayPos = json[13];
        return this;
    },
    saveBin: function (buffer) {
        buffer.writeInt(this.id);
        buffer.writeFloat(this.startPosition.x);
        buffer.writeFloat(this.startPosition.y);
        buffer.writeInt(this.startAngle);
        var delta = (this.endAngle - this.startAngle + this.rails.grad) % this.rails.grad;
        if (this.curve<0) delta = delta - this.rails.grad;
        buffer.writeInt(delta);
        buffer.writeFloat(this.len);
        buffer.writeFloat(this.pos);
        buffer.writeFloat(this.highwayPos);
    },
    loadBin: function(buffer, path) {
        var id = buffer.readInt();
        this.startPosition.x = buffer.readFloat();
        this.startPosition.y = buffer.readFloat();
        var startAngle = buffer.readInt();
        var delta = buffer.readInt();
        var len = buffer.readFloat();
        if (delta == 0) {
            path.rails.createStraight(this.startPosition, startAngle, len, this);
        } else {
            path.rails.createCurve(this.startPosition, startAngle, delta, this);
        }
        this.path = path;
        this.id = id;
        this.pos = buffer.readFloat();
        this.highwayPos = buffer.readFloat();
        return this;
    }
};

},{"./pixi/Point":18,"./pixi/Rectangle":19}],13:[function(require,module,exports){
/**
 * Created by Liza on 01.08.2015.
 */

var Point = require('./pixi/Point');
var Rectangle = require('./pixi/Rectangle');

function Switch(rails) {
    if (rails) this.init(rails);
}

module.exports = Switch;

Switch.prototype = {
    id: 0,
    pathTo: 0,
    pathFrom: 0,
    railTo: 0,
    railFrom: 0,
    posTo: 0,
    posFrom: 0,
    init: function(pathFrom, railFrom, posFrom, pathTo, railTo, posTo) {
        var rails = pathFrom.rails;
        this.id = ++rails.incrementId;
        this.pathFrom = pathFrom || 0;
        this.railFrom = railFrom || 0;
        this.posFrom = posFrom || 0;
        this.pathTo = pathTo || 0;
        this.railTo = railTo || 0;
        this.posTo = posTo || 0;
        return this;
    },
    copy: function(sw) {
        this.id = sw.id;
        this.railTo = sw.railTo;
        this.railFrom = sw.railFrom;
        this.posTo = sw.posTo;
        this.posFrom = sw.posFrom;
        this.pathTo = sw.pathTo;
        this.pathFrom = sw.pathFrom;
        return this;
    },
    clone: function() {
        var sw = new Switch();
        sw.copy(this);
        return sw;
    },
    toJson: function() {
        return {
            pathTo: this.pathTo.id,
            railTo: this.railTo.id,
            posTo: this.posTo,
            pathFrom: this.pathFrom.id,
            railFrom: this.railFrom.id,
            posFrom: this.posFrom
        }
    },
    saveBin: function(buffer) {
        buffer.writeInt(this.pathTo.id);
        buffer.writeInt(this.railTo.id);
        buffer.writeFloat(this.posTo);
        buffer.writeInt(this.pathFrom.id);
        buffer.writeInt(this.railFrom.id);
        buffer.writeFloat(this.posFrom);
    },
    loadBin: function(buffer) {
        this.pathTo = buffer.readInt();
        this.railTo = buffer.readInt();
        this.posTo = buffer.readFloat();
        this.pathFrom = buffer.readInt();
        this.railFrom = buffer.readInt();
        this.posFrom = buffer.readFloat();
        return this;
    }
};

},{"./pixi/Point":18,"./pixi/Rectangle":19}],14:[function(require,module,exports){
function Tracker(pos, rail) {
    this.pos = pos;
    this.travel = 0;
    this.rail = rail;
}

module.exports = Tracker;

Tracker.prototype.getPos = function() {
    return this.rail.pointAt(this.pos);
}

Tracker.prototype.move = function(ds, rand) {
    this.pos += ds;
    cycle :while (this.pos >= this.rail.len && this.rail.next) {
        var rail = this.rail;
        this.travel += rail.len;
        this.pos -= rail.len - rail.nextPos;

        var path = rail.next.path;
        for (var i = 0; i < path.waysOut.length; i++) {
            var w = path.waysOut[i];
            if (w.railFrom == rail && w.enabled) {
                this.rail = w.railTo;
                continue cycle;
            }
        }
        this.rail = rail.next;
    }
}

},{}],15:[function(require,module,exports){
/**
 * Created by Liza on 11.08.2015.
 */

var Point = require('./pixi/Point');
function TrainWay(level, listener) {
    this.level = level;
    this.options = level.gameRes.options;
    this.types = level.gameRes.obstacles;
    this.segments = [];
    this.obstacles = [];
    this.curPos = 0;
    this.obstPos = this.options.startCoord || 200;
    this.listener = listener;
}

function patchIndex(level, rail) {
    if (!rail) return -1;
    for (var i=0;i<level.patches.length && i<4;i++) {
        if (level.patches[i].paths.indexOf(rail.path)>=0) return i;
    }
    return -1;
}

module.exports = TrainWay;

TrainWay.prototype = {
    add: function(seg, nextPos) {
        nextPos = nextPos || 0;
        seg.coord = this.curPos - nextPos;
        this.segments.push(seg);
        this.curPos += seg.len - nextPos;
    },
    pop: function(seg) {
        var s = this.segments.pop();
        this.curPos -= s.len - this.tail().nextPos;
    },
    tail: function(index) {
        return this.segments[this.segments.length-1-(index|0)];
    },
    shift: function() {
        this.segments.shift();
    },
    update: function(dt, maxX) {
        var level = this.level;
        var segments = this.segments;
        var obstacles = this.obstacles;
        var listener = this.listener;
        if (segments.length>0) {
            while (patchIndex(level, segments[0])<0) {
                this.shift();
            }
        } else {
            this.add(level.patches[0].paths[0].segments[0]);
        }
        var oldIndex2 = segments.length;
        while (patchIndex(level, this.tail())<0) {
            this.pop();
        }
        var oldIndex = segments.length;
        while (patchIndex(level, this.tail().next)>=0) {
            this.add(this.tail().next, this.tail().nextPos);
        }
        while (obstacles.length>0 && obstacles[0].coord < segments[0].coord) {
            listener && listener.onRemove(obstacles.shift());
        }
        if (oldIndex != oldIndex2 || oldIndex != segments.length)
            this.expand(oldIndex);
        for (var i=0;i<obstacles.length;i++) {
            listener && listener.onUpdate(obstacles[i], dt, maxX);
        }
    },
    tempPoint: new Point(),
    camX: function(pos, w, w2) {
        w  = w || 100;
        w2 = w2 || w;
        var segments = this.segments;
        var x = -1, x0 = -1;
        for (var i=0;i<segments.length;i++) {
            var seg = segments[i];
            if (pos>0) {
                if (pos <= seg.coord + seg.len) {
                    x = seg.pointAt(pos - seg.coord, this.tempPoint).x;
                    x0 = x;
                    pos = 0;
                }
            }
            if (pos==0) {
                if (seg.endPosition.x >= x + w) return Math.max(x, x0-w2);
                x = Math.min(x, seg.endPosition.x);
            }
        }
        return Math.max(x, x0-w2);
    },
    expand: function(oldIndex) {
        var segments = this.segments;
        var obstacles = this.obstacles;
        var options = this.options;
        var listener = this.listener;
        var level = this.level;
        if (options.obstacles != 1) return;

        //1. find object obstacles//
        var o = [];
        for (var i=oldIndex; i<segments.length; i++) {
            var s = segments[i];
            if (s.mapObj) {
                var mapObj = s.mapObj;
                for (var t=0; t<this.types.length;t++) {
                    var tt = this.types[t];
                    if (tt.bindObj == mapObj.name) {
                        var obst = Object.create(tt);
                        obst.way = this;
                        obst.coord = s.coord + (obst.railPos || 0);
                        obst.position = 0;
                        obst.mapObj = mapObj;
                        obst.state = obst.state || 0;
                        obst.special = true;
                        obstacles.push(obst);
                        o.push(obst);
                    }
                }
            }

            if (!s.next || s.next.path != s.path) {
                //end of line
                var ind = patchIndex(level, s);
                var ind2 = s.next?patchIndex(level, s.next):-1;
                if (ind!=ind2 && level.patches[ind].highway) {
                    for (var t=0; t<this.types.length;t++) {
                        var tt = this.types[t];
                        if (tt.name.substring(0, 7) != "highway") continue;
                        var obst = Object.create(tt);
                        obst.way = this;
                        obst.coord = s.coord + s.highwayPos;
                        obst.position = 0;
                        obst.mapObj = tt.name;
                        obst.state = obst.state || 0;
                        obst.special = true;
                        obstacles.push(obst);
                        o.push(obst);
                    }
                }
            }
        }
        var roster = [];
        cycle:while (this.obstPos < this.curPos + 1000) {
            if (roster.length == 0) {
                var sumProb = 0;
                for (var i = 0; i < this.types.length; i++) {
                    var tt = this.types[i];
                    if (tt.hasOwnProperty("exactPlace")) {
                        if (tt.exactPlace < this.curPos + 1000 && tt.maxTimes>0) {
                            tt.maxTimes --;
                            var obst = Object.create(tt);
                            obst.way = this;
                            obst.coord = tt.exactPlace;
                            obst.position = 0;
                            obst.state = obst.state || 0;
                            obst.special = true;
                            obstacles.push(obst);
                            o.push(obst);
                        }
                    } else
                    if (tt.hasOwnProperty("prob")) {
                        if (tt.hasOwnProperty("maxTimes")) {
                            if (tt.maxTimes <= 0) continue;
                        }
                        if (tt.hasOwnProperty("minDist")) {
                            if (this.obstPos < tt.minDist) continue;
                        }
                        roster.push(tt);
                        sumProb += tt.prob;
                    }
                }
            }

            var typeS = Math.random() * sumProb | 0;
            var typeInd = 0;
            while (typeInd + 1 < roster.length && roster[typeInd].prob <= typeS) {
                typeS -= roster[typeInd].prob;
                typeInd++;
            }

            var t = (options.betweenObstacles || 100) * (Math.random() + 1);
            this.obstPos += t;

            for (var i = 0; i < o.length; i++) {
                if (Math.abs(o[i].coord - this.obstPos) < 100)
                    continue cycle;
            }

            var obj = Object.create(roster[typeInd]);
            obj.way = this;
            obj.coord = this.obstPos;
            obj.position = 0;
            obj.state = obj.state || 0;
            obstacles.push(obj);

            if (roster[typeInd].hasOwnProperty("maxTimes")) {
                roster[typeInd].maxTimes--;
                roster = [];
            }
        }

        var coord = oldIndex < segments.length?segments[oldIndex].coord: this.curPos;
        var remove = [];
        cycle2: for (var i=0;i<obstacles.length;i++) {
            var obst = obstacles[i];
            if (!obst.special) {
                for (var j = 0; j < o.length; j++) {
                    if (Math.abs(o[j].coord - obst.coord) < 100) {
                        remove.push(i);
                        continue cycle2;
                    }
                }
            }

            if (obst.coord < coord) continue;
            var j=0;
            while (j<segments.length && segments[j].coord + segments[j].len <= obst.coord) {
                j++;
            }
            if (j==segments.length) {
                if (obst.mapObj) {
                    remove.push(i);
                }
                continue;
            }
            var flag = !obst.position;
            obst.position = segments[j].pointAt(obst.coord - segments[j].coord);
            if (flag) {
                listener && listener.onAdd(obst);
            }
            listener && listener.onChange(obst);
        }
        while (remove.length>0) {
            var r = remove.pop();
            listener && listener.onRemove(obstacles[r]);
            obstacles.splice(r, 1);
        }
    }
}

},{"./pixi/Point":18}],16:[function(require,module,exports){
var Point = require('./pixi/Point');

function WayTracker(way, pos) {
    this.way = way;
    this.pos = pos;
    this.rail = way.segments[0];
    this.position = new Point();
    this.move(0);
}

module.exports = WayTracker;

WayTracker.prototype = {
    move: function(ds) {
        this.pos += ds;
        var segments = this.way.segments;
        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];
            if (seg.coord + seg.len >= this.pos) {
                this.rail = seg;
                seg.pointAt(this.pos - seg.coord, this.position);
                return this;
            }
        }
        return this;
    },
    copy: function(src) {
        this.pos = src.pos;
        this.rail = src.rail;
        return this;
    }
}


},{"./pixi/Point":18}],17:[function(require,module,exports){
/**
 * Created by Liza on 02.08.2015.
 */

module.exports = {
    // These will be mixed to be made publicly available,
    // while this module is used internally in core
    // to avoid circular dependencies and cut down on
    // internal module requires.

    AABB: require('./AABB'),
    Builder: require('./Builder'),
    FieldObject: require('./FieldObject'),
    Generator: require('./Generator'),
    Buffer: require('./Buffer'),
    Grid: require('./Grid'),
    Level: require('./Level'),
    Path: require('./Path'),
    Rails: require('./Rails'),
    Switch: require('./Switch'),
    Tracker: require('./Tracker'),
    TrainWay: require('./TrainWay'),
    WayTracker: require('./WayTracker'),
    GameResources: require('./GameResources'),
    Point: require('./pixi/Point'),
    Rectangle: require('./pixi/Rectangle'),
    setOptionDefaults: function(options) {
        options.width = options.width || 1200;
        options.height = options.height || 720;
        options.wayLen = options.wayLen || 150;
        options.trainStartSpeed = options.trainStartSpeed || 100;
        options.trainMaxSpeed = options.trainMaxSpeed || 100;
        options.trainRandomWaySpeed = options.trainRandomWaySpeed || 100;
        options.trainDistanceBeforeMaxSpeed = options.trainDistanceBeforeMaxSpeed || 10000;
        options.trainTraction = options.trainTraction || 2;
        options.showTipDistance = options.showTipDistance || 100;
        options.startWays = options.startWays || 1;
        options.minWays = options.minWays || 1;
        options.maxWays = options.maxWays || 1;
        options.lazyPatches = options.lazyPatches || 7;
        options.smartCam = options.smartCam || 2;
        options.frontCanvas = options.frontCanvas || 2;
        options.backCanvas = options.backCanvas || 1;
        options.webworker = options.webworker || 1;
        options.railsSize = options.railsSize || 2;
        options.topOffset = options.topOffset || 40;
        options.bottomOffset = options.bottomOffset || 25;
        options.webgl = options.webgl || 1;
        options.obstacles = options.obstacles || 1;
        options.randomWay = options.randomWay || 1;
        options.endStation = options.endStation || 0.5;
        options.endStationCoeff = options.endStationCoeff || 200;
        return options;
    }
};

},{"./AABB":2,"./Buffer":3,"./Builder":4,"./FieldObject":5,"./GameResources":6,"./Generator":7,"./Grid":8,"./Level":9,"./Path":10,"./Rails":11,"./Switch":13,"./Tracker":14,"./TrainWay":15,"./WayTracker":16,"./pixi/Point":18,"./pixi/Rectangle":19}],18:[function(require,module,exports){
/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 *
 * @class
 * @memberof PIXI
 * @param [x=0] {number} position of the point on the x axis
 * @param [y=0] {number} position of the point on the y axis
 */
function Point(x, y)
{
    /**
     * @member {number}
     * @default 0
     */
    this.x = x || 0;

    /**
     * @member {number}
     * @default 0
     */
    this.y = y || 0;
}

Point.prototype.constructor = Point;
module.exports = Point;

/**
 * Creates a clone of this point
 *
 * @return {PIXI.Point} a copy of the point
 */
Point.prototype.clone = function ()
{
    return new Point(this.x, this.y);
};

/**
 * Copies x and y from the given point
 *
 * @param p {PIXI.Point}
 */
Point.prototype.copy = function (p) {
    this.set(p.x, p.y);
};

/**
 * Returns true if the given point is equal to this point
 *
 * @param p {PIXI.Point}
 * @returns {boolean}
 */
Point.prototype.equals = function (p) {
    return (p.x === this.x) && (p.y === this.y);
};

/**
 * Sets the point to a new x and y position.
 * If y is omitted, both x and y will be set to x.
 *
 * @param [x=0] {number} position of the point on the x axis
 * @param [y=0] {number} position of the point on the y axis
 */
Point.prototype.set = function (x, y)
{
    this.x = x || 0;
    this.y = y || ( (y !== 0) ? this.x : 0 ) ;
};

},{}],19:[function(require,module,exports){
/**
 * the Rectangle object is an area defined by its position, as indicated by its top-left corner point (x, y) and by its width and its height.
 *
 * @class
 * @memberof PIXI
 * @param x {number} The X coordinate of the upper-left corner of the rectangle
 * @param y {number} The Y coordinate of the upper-left corner of the rectangle
 * @param width {number} The overall width of this rectangle
 * @param height {number} The overall height of this rectangle
 */
function Rectangle(x, y, width, height)
{
    /**
     * @member {number}
     * @default 0
     */
    this.x = x || 0;

    /**
     * @member {number}
     * @default 0
     */
    this.y = y || 0;

    /**
     * @member {number}
     * @default 0
     */
    this.width = width || 0;

    /**
     * @member {number}
     * @default 0
     */
    this.height = height || 0;

    /**
     * The type of the object, mainly used to avoid `instanceof` checks
     *
     * @member {number}
     */
    this.type = 1;
}

Rectangle.prototype.constructor = Rectangle;
module.exports = Rectangle;

/**
 * A constant empty rectangle.
 *
 * @static
 * @constant
 */
Rectangle.EMPTY = new Rectangle(0, 0, 0, 0);


/**
 * Creates a clone of this Rectangle
 *
 * @return {PIXI.Rectangle} a copy of the rectangle
 */
Rectangle.prototype.clone = function ()
{
    return new Rectangle(this.x, this.y, this.width, this.height);
};

/**
 * Checks whether the x and y coordinates given are contained within this Rectangle
 *
 * @param x {number} The X coordinate of the point to test
 * @param y {number} The Y coordinate of the point to test
 * @return {boolean} Whether the x/y coordinates are within this Rectangle
 */
Rectangle.prototype.contains = function (x, y)
{
    if (this.width <= 0 || this.height <= 0)
    {
        return false;
    }

    if (x >= this.x && x < this.x + this.width)
    {
        if (y >= this.y && y < this.y + this.height)
        {
            return true;
        }
    }

    return false;
};

},{}]},{},[1])


//# sourceMappingURL=worker.js.map