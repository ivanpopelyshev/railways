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
