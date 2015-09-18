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
