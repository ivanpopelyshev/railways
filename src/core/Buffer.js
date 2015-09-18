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
