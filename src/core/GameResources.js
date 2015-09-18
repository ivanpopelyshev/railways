/**
 * Created by Liza on 11.08.2015.
 */


var Rails = require('./Rails');
var Point = require('./pixi/Point');
var FieldObject = require('./FieldObject');

function GameResources(options, shapes, atlas, clusters, stations) {
    this.options = options;
    this.shapes = shapes;
    this.atlas = atlas;
    this.clusters = clusters;
    this.stations = stations;
}

module.exports = GameResources;

GameResources.prototype = {
    initModels: function () {
        if (this.models) return;
        var options = this.options;
        var atlas = this.atlas.frames;
        var models = this.models = {};
        var shapes = this.shapes;
        for (var key in shapes) if (shapes.hasOwnProperty(key)) {
            models[key] = new FieldObject(key, shapes[key]);
            models[key].model = key;
            if (atlas.hasOwnProperty(key + "b")) {
                models[key + "b"] = models[key];
            }
        }
        var rails = this.rails = new Rails(72, new Point(options.railsSize, options.railsSize * 2 / 3), 64, 2);
        if (!this.clusters) {
            var clusters = this.clusters = [];
            if (this.options.clusters != 1) {
                for (var key in shapes) if (shapes.hasOwnProperty(key)) {
                    if (key.indexOf("station") < 0 && key.indexOf("bridge") < 0 && key.indexOf("perehod") < 0 && key.indexOf("platform") < 0) {
                        var obj = {
                            main: [key]
                        }
                        if (atlas.hasOwnProperty(key + "b")) {
                            obj.main.push(key + "b");
                        }
                        clusters.push(obj);
                    }
                }
            } else {
                var trees = ["bush1", "pine1", "tree1", "tree2"];

                var rocks = ["bigrock1", "bigrock2", "smallcrag1", "smallcrag2", "smallrock1", "smallrock2", "smallrock3"];
                var big = [["crag1", "crag2", "pond1"]];

                var lst = [];
                big.forEach(function (bigStuff) {
                    var cluster = {
                        tries: 100, once: true,
                        main: bigStuff,
                        secondary: [
                            {radMin: 10, radMax: 100, count: 5, tries: 100, list: lst},
                            {radMin: 100, radMax: 200, count: 5, tries: 100, list: lst}
                        ]
                    };
                    trees.forEach(function (t) {
                        lst.push(t);
                        lst.push(t + "b");
                        lst.push(t);
                        lst.push(t + "b");
                    });
                    rocks.forEach(function (t) {
                        lst.push(t);
                    });
                    clusters.push(cluster);
                });
                for (var i = 0; i < 3; i++) {
                    var tr1 = [trees[i], trees[i] + "b"];
                    if (i == 2) {
                        tr1.push(trees[3]);
                        tr1.push(trees[3] + "b");
                    }
                    var tr2 = [];
                    tr1.forEach(function (t) {
                        tr2.push(t)
                    })
                    tr1.forEach(function (t) {
                        tr2.push(t)
                    })
                    tr1.forEach(function (t) {
                        tr2.push(t)
                    })
                    tr1.forEach(function (t) {
                        tr2.push(t)
                    })
                    rocks.forEach(function (t) {
                        tr2.push(t)
                    })
                    cluster = {
                        tries: 20,
                        main: trees, neibRadius: 100,
                        secondary: [
                            {radMin: 10, radMax: 100, count: 5, tries: 100, list: tr1},
                            {radMin: 100, radMax: 200, count: 5, tries: 100, list: tr2}
                        ]
                    };
                    clusters.push(cluster);
                }
            }
        }
        if (!this.rivers) {
            this.rivers = {
                water: [{ p: 10, list: [{ model: "river2", shiftX: 150 }] },
                    { p:1, list: [ {model: "riverbig1", shiftX: options.width - 714},
                      { model: "riverbig2", shiftX: 714 }, {model: "riverbig3", shiftY: options.height-429, shiftX: 1200}]}],
                bridges: [
                    {
                        "angle": 5,
                        "len": 100,
                        "padding": 15,
                        "base": "bridgeNE_base",
                        "top": "bridgeNE_top"
                    },
                    {
                        "angle": 7,
                        "len": 100,
                        "padding": 15,
                        "base": "bridgeSE_base",
                        "top": "bridgeSE_top"
                    },
                    {
                        "angle": 6,
                        "len": 100,
                        "padding": 15,
                        "base": "bridgeE_base",
                        "top": "bridgeE_top"
                    }
                ]
            }
        }
        if (!this.stations) {
            var stations = this.stations = [];
            stations.push({
                "angle": 6,
                "bonusRail": 200,
                "list": [
                    {"x": 0, "y": -210, "model": "station", "name": "station1"},
                    {"x": 18, "y": 20, "model": "platform", "name": "platform"},
                    //{ "x": 0, "y": -100, "model": "station"},
                    {"x": 285, "y": -110, "model": "perehod_base"},
                    {"x": 285, "y": -110, "model": "perehod_top"}
                ]
            })
            stations.push({
                "angle": 6,
                "bonusRail": 150,
                "list": [
                    {"x": 18, "y": -50, "model": "platform", "name": "station2"},
                    {"x": 18, "y": 20, "model": "platform", "name": "platform"},
                    {"x": 285, "y": -110, "model": "perehod_base"},
                    {"x": 285, "y": -110, "model": "perehod_top"}
                ]
            })
        }
        if (!this.obstacles) {
            this.obstacles = [
//                { name: "pointer_coin", duration: 0.2},
//                { name: "evacuator", duration: 1},
//                { name: "lights", duration: 1},
                {
                    prob: 1, name: "phones1", duration: 0.5, vel: 10,
                    icons: ["phones1", "phones2"], iconAnimSpeed: 1000,
                    useHorn: 400,
                    pointerIcon: "pointer3",
                    humanModels: ["man", "man_color1", "man_color2", "man_color3"]
                },
                {
                    prob: 0.5, name: "runner", duration: 0.5, vel: 3.5, walkVel: 30, state: 3,
                    icons: ["runner"]
                },
                {
                    name: "highway", duration: 0.5, betweenMin: 100, betweenMax: 150, minDistance: 50,
                    vel: 120,
                    icons: ["lights"],
                    carModels: ["car1", "car2", "car3", "car4"]
                },
                {
                    prob: 1, name: "kids", duration: 0.5, radius: 50, vel: 40, humanCount: 2,
                    icons: ["children"],
                    humanModels: ["child", "child2"]
                },
                {
                    prob: 1, name: "junk", duration: 0.5,
                    icons: ["trash"]
                },
                //several variants of stations
                {
                    name: "lights1", bindObj: "station1", duration: 0.5, humanCount: 10, railPos: 100,
                    vel: 80,
                    walkingCount: 5,
                    icons: ["lights"],
                    platforms: [
                        {x: 50, y: -30, w: 280, h: 7},
                        {x: 40, y: 35, w: 320, h: 15}
                    ],
                    ways: [
                        [{x: 340, y: -25}, {x: 340, y: 35}],
                        [{x: 345, y: 35}, {x: 345, y: -25}],
                        [{x: 370, y: -30}, {x: 462, y: -30, z: 40}, {x: 476, y: -30, z: 40},
                            {x: 476, y: 35, z: 40}, {x: 462, y: 35, z: 40}, {x: 370, y: 35}],
                        [{x: 370, y: 40}, {x: 462, y: 35, z: 40}, {x: 476, y: 35, z: 40},
                            {x: 476, y: -30, z: 40}, {x: 476, y: -30, z: 40}, {x: 370, y: -30}]
                    ],
                    humanModels: ["man", "man_color1", "man_color2", "man_color3"]
                },
                {
                    name: "lights2", bindObj: "station2", duration: 0.5, humanCount: 10, railPos: 100,
                    vel: 80,
                    walkingCount: 5,
                    icons: ["lights"],
                    platforms: [
                        {x: 50, y: -30, w: 280, h: 7},
                        {x: 40, y: 35, w: 320, h: 15}
                    ],
                    ways: [
                        [{x: 340, y: -25}, {x: 340, y: 35}],
                        [{x: 345, y: 35}, {x: 345, y: -25}],
                        [{x: 370, y: 40}, {x: 462, y: 35, z: 40}, {x: 476, y: 35, z: 40},
                            {x: 476, y: -30, z: 40}, {x: 476, y: -30, z: 40}, {x: 370, y: -30}]
                    ],
                    humanModels: ["man", "man_color1", "man_color2", "man_color3"]
                },
                {
                    prob: 100, name: "delorean", duration: 2.5, vel: 120,
                    exactPlace: 20430, maxTimes: 1, showScore: 2015,
                    icons: ["evacuator"],
                    carModels: ["delorean"]
                }
            ]
        }
    },
    toJson: function () {
        return {
            options: this.options,
            shapes: this.shapes,
            atlas: this.atlas,
            clusters: this.clusters,
            stations: this.stations,
            rivers: this.rivers,
            obstacles: this.obstacles
        }
    },
    fromJson: function (json) {
        this.options = json.options;
        this.shapes = json.shapes;
        this.atlas = json.atlas;
        this.clusters = json.clusters;
        this.stations = json.stations;
        this.rivers = json.rivers;
        this.obstacles = json.obstacles;
        this.initModels();
        return this;
    }
}
