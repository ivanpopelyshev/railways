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
