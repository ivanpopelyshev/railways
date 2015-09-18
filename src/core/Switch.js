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
