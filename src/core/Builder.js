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
