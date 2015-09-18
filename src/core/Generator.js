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
