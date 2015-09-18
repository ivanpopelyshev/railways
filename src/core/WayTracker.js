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

