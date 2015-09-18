/**
 * Created by Liza on 02.08.2015.
 */

var Game = require('../core');
var Point = Game.Point;
var Level = Game.Level;
var Rails = Game.Rails;
var GameResources = Game.GameResources;
var FieldObject = Game.FieldObject;

var rails;
var level, options;

var genTest = 0, genCallback = null;

var listener = {
    removeFront: function() {
        self.postMessage({
            method: "removeFront"
        });
    },
    addPatch: function(patch) {
        self.postMessage({
            method: "addPatch",
            patch: patch.toJson()
        });
        if (level && level.patches.length >= genTest && genCallback) {
            genCallback();
            genCallback = null;
        }
    }
};

self.addEventListener('message', function(e) {
    var data = e.data;
    switch (data.method) {
        case 'start':
            options = data.gameRes.options;
            //options.seed = 5;
            useAjax = options.hasOwnProperty("seed");
            if (useAjax) {
                options.seed = (options.seed%5000);
                ajaxNum = options.seed;
            }
            level = new Level(new GameResources().fromJson(data.gameRes), listener);
            break;
        case 'gen':
            genTest = data.lazyPatches;
            genCallback = function() {
                self.postMessage({method: 'done'});
                resumeGen();
            };
            if (useAjax) {
                tryAjax();
            } else {
                level.genSync(data.lazyPatches);
            }
            break;
        case 'close':
            self.close();
            break;
        case 'removeBack':
            level.removeBack(function() {
                if (data.cb)
                    self.postMessage({method: 'done'});
                resumeGen();
            });
            break;
    }
}, false);

var useAjax = false, waitingAjax = false;
var ajaxNum = 0;
function tryAjax() {
    if (waitingAjax) return;
    if (level.patches.length>=10) return;

    waitingAjax=new XMLHttpRequest();
    //waitingAjax.overrideMimeType('text\/plain; charset=x-user-defined');
    waitingAjax.onreadystatechange=function(){
        if (waitingAjax.readyState!=4) return;
        if (waitingAjax.status==200) {
            //var resp = waitingAjax.response;
            //var buf = new Game.Buffer(resp.length);
            //for (var i=0;i<resp.length;i++) buf.data.setUint8(i, resp.charCodeAt(i));
            //buf.pos = resp.length;
            //buf.startRead();
            var buf = new Game.Buffer(waitingAjax.response);

            if (level.patches.length == 1 && ajaxNum == options.seed) {
                level.removeFront();
            }
            while (buf.pos<buf.len) {
                var patch = new Game.Builder();
                patch.loadBin(buf, level.gameRes, level.tail(0), false);
                level.addPatch(patch);
            }
            waitingAjax = false;
            ajaxNum++;
            tryAjax();
        } else {
            useAjax = false;
            level.removed = true;
            resumeGen();
        }
    };

    waitingAjax.open("GET", "../railcache/"+format(Math.floor(ajaxNum/1000)*1000, 6) + "/" + format(ajaxNum%1000, 6)+".dat",true);
    waitingAjax.responseType = "arraybuffer";
    waitingAjax.send();
}

function format(id, num) {
    id=id+"";
    while (id.length<num) id = "0"+id;
    return id;
};

function resumeGen() {
    if (useAjax )
        tryAjax();
    else
    if (!timeout)
        timeout = setTimeout(generation, 0);
}

var timeout = 0;

function generation() {
    timeout = 0;
    if (level.doIt2(500)) {
        resumeGen();
    }
}
