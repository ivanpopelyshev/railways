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
