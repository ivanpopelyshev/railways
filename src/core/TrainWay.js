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
