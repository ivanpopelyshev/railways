/**
 * Created by Liza on 13.08.2015.
 */

module.exports = function(resources, stats, storage, $rootScope, tracker) {
    var pixi  = require('pixi.js')
    var spine = require('pixi-spine')
    var raf   = require('raf')
    var time  = require('right-now')
    var async = require('async')
    var Stats = require('stats-js')

    var Game = require('../core');
    var Grid = Game.Grid;
    var Rails = Game.Rails;
    var Builder = Game.Builder;
    var Path = Game.Path;
    var GameResources = Game.GameResources;
    var Railroad = require('./railroad');
    var SwitchActor = require('./SwitchActor');
    var Train = require('./Train');
    var TrainWay = Game.TrainWay;
    var FieldObject = Game.FieldObject;
    var Generator = Game.Generator;
    var Level = Game.Level;
    var LevelAsync = require('./LevelAsync');
    var ObstaclesView = require('./ObstaclesView');
    var Horn = require('./Horn');

    var Point = pixi.Point;
    var Rectangle = pixi.Rectangle;

    var view, loader, stats;
    var last = time(), lastTry = time();

    var backView, frontView, webGlView, backTest, frontTest, switchesView, obstaclesView, horn;
    var renderers;

    var score = 0;

    var scope = null;

    var level;

    var options;
    function setOptions(opt) {
        options = opt || {};
        STAGE_WIDTH = options.width;
        STAGE_HEIGHT = options.height;
        Game.setOptionDefaults(options);
    }

    function renderBack() {
        var objs = [];
        railroad.init(level.patches);
        railroad.generate();
        //level.patches[0].prevObjects.forEach(function(obj){ objs.push(obj); });
        for (var i=0;i<4 && i < level.patches.length;i++) {
            var patch = level.patches[i];
            patch.objects.forEach(function(obj){ objs.push(obj); });
        }
        fillObjects(objs);
        camera.dirty = true;

        switchesView.removeChildren();
        level.patches.forEach(function(patch) {
            patch.paths.forEach(function(path) {
                path.waysOut.forEach(function(way) {
                    switchesView.addChild(new SwitchActor(way));
                });
            })
        });
    }

    function renderBack2() {
        backView.removeChildren();
        var backTex = resources.list['back'].texture;
        var backWidth = backTex.width;
        var i1 = Math.floor(camera.backX / backWidth) * backWidth;
        while (i1 < camera.backX + STAGE_WIDTH*STAGE_BUF) {
            var spr = new pixi.Sprite(backTex);
            spr.position.x = i1;
            backView.addChild(spr);
            i1 += backWidth;
        }
        backView.addChild(railroad);
        //backView.addChild(switchesView);
        backView.addChild(backTest);
        backView.position.x = -camera.backX;
        frontTest.position.x = -camera.backX;
        if (options.backCanvas == 1)
            renderers[0].render(backView);
        if (options.frontCanvas == 1)
            renderers[2].render(frontTest);
    }
    function fillObjects(objs) {
        backTest.removeChildren();
        frontTest.removeChildren();
        //HACK FOR BRIDGE/RIVER
        objs = objs.filter(function(obj) {
            if (obj.name.substring(0, 6)=="bridge" || obj.name.substring(0, 5)=="river") {
                var spr = new pixi.Sprite(resources.list[obj.name].texture);
                spr.position.x = obj.position.x;
                spr.position.y = obj.position.y;
                railroad.layer1.addChild(spr);
                if (obj.name.substring(0, 6)=="bridge") {
                    spr.anchor.x = spr.anchor.y = 0.05;
                    spr = new pixi.Sprite(resources.list[obj.name.substring(0, obj.name.length-4)+"top"].texture);
                    spr.position.x = obj.position.x;
                    spr.position.y = obj.position.y;
                    spr.anchor.x = spr.anchor.y = 0.05;
                    frontTest.addChild(spr);
                }
                return false;
            }
            return true;
        });
        objs.sort(function(a, b) {
            var b1 = a.getBounds(), b2 = b.getBounds();
            return Math.round(b1.y + b1.height - (b2.y + b2.height));
        });
        objs.forEach(function(obj) {
            var res = resources.list['sprites'];
            var texName = res.textures[obj.name]?obj.name:obj.proto.name;
            var tex = res.textures[texName];
            var spr = new pixi.Sprite(tex);
            spr.position.x = obj.position.x;
            spr.position.y = obj.position.y;

            var sss = res.data.frames[texName].spriteSourceSize;
            if (sss) {
                spr.position.x -= sss.x;
                spr.position.y -= sss.y;
            }
            spr.scale = obj.scale;
            if ((obj.proto.filter & 16) != 0) {
                frontTest.addChild(spr);
            } else
                backTest.addChild(spr);
        });
        objs.forEach(function(obj) {
            if ((obj.proto.filter&7)<2) return;
            var res = resources.list['sprites'];
            var texName = res.textures[obj.name]?obj.name:obj.proto.name;
            var tex = res.textures[texName]
            var b = obj.proto.getBounds();
            var yy = b.y; //Math.round(b.y * obj.scale.y);

            var sss = res.data.frames[texName].spriteSourceSize;
            if (sss) {
                yy -= sss.y;
            }

            var newTex = new pixi.Texture(tex.baseTexture, new Rectangle(tex.frame.x, tex.frame.y, tex.frame.width, yy));

            var spr = new pixi.Sprite(newTex);
            spr.position = obj.position;
            if (sss) {
                spr.position.x -= sss.x;
                spr.position.y -= sss.y;
            }
            spr.scale = obj.scale;
            frontTest.addChild(spr);
        });
    }

    var rails, train, railroad, debug, way, gameRes, debugText, debugView;
    var debugPercent;
    var rawModels;

    function reset() {
        frontView.removeChildren();
        debug = new pixi.Graphics();
        debug.beginFill(0xDD00DD, 0.9);
        debug.drawCircle(40, 40, 20);
        debug.endFill();
        debug.visible = false;
        frontView.addChild(debug);

        debugView = new pixi.Container();
        debugView.visible = true;
        debugText = new pixi.Text("0%", {font:"bold 50px FSrail55", fill:"white"});
        debugText.anchor.x = debugText.anchor.y = 0.5;
        debugText.position.x = STAGE_WIDTH/2;
        debugText.position.y = STAGE_HEIGHT/2;
        debugView.addChild(debugText);

        if (options.ajax == 1)
            options.seed = Math.random()*100000|0;
        if (options.webworker == 1) {
            level = new LevelAsync(gameRes);
        } else
            level = new Level(gameRes);

        game.result = {
            gameId: scope.gameId,
            score: 0,
            lives: 0,
            obstacles: [0,0,0,0,0,0]
        }
        game.finished = false;


        debugPercent = 0;

        tracker.startGame(function(data, status) {
            game.result.gameId = data.gameId;
            game.result.lives = data.lives || 0;
        }, function() {
        });

        level.genSync(options.lazyPatches, function() {
            camera.shiftX = level.patches[0].paths[0].segments[0].startPosition.x;

            railroad = new Railroad(resources.list, gameRes);
            renderBack();
            way = new TrainWay(level);
            obstaclesView = new ObstaclesView();
            train = new Train(way, resources.list);
            obstaclesView.init(train, resources.list, obstacleListener);
            way.update(0);
            train.init(4, options, obstacleListener);
            for (var i=0;i<train.cars.length;i++)
                obstaclesView.layers[1].addChild(train.cars[i]);
            frontView.addChild(obstaclesView.layers[0]);
            frontView.addChild(obstaclesView.layers[1]);
            //frontView.addChild(train);
            frontView.addChild(obstaclesView.layers[2]);
            frontView.addChild(train);
            if (options.frontCanvas!=1)
                frontView.addChild(frontTest);
            frontView.addChild(obstaclesView.layers[3]);
            setupButtons();
            frontView.addChild(obstaclesView);
            horn = new Horn();
            horn.init(way, train, resources.list);
            frontView.addChild(horn);
            train.maxVelocity = options.trainStartSpeed;
            train.traction = options.traction;

            last = time();
        });
    }

    var scoreView, buttonsView, scoreText, livesText, pauseBtn, soundBtn;

    function setupButtons() {
        var sprites = resources.list['sprites'];
        scoreView = new pixi.Container();
        scoreView.addChild(new pixi.Sprite(sprites.textures['scores_lives']));

        livesText = new pixi.Text("3", {font:"bold 25px FSrail55", fill:"black"});
        livesText.position.x = 190;
        livesText.position.y = 26;
        livesText.anchor.y = 0.5;
        scoreView.addChild(livesText);

        scoreText = new pixi.Text("0", {font:"bold 25px FSrail55", fill:"black"});
        scoreText.position.x = 70;
        scoreText.position.y = 26;
        scoreText.anchor.x = 0.5;
        scoreText.anchor.y = 0.5;
        scoreView.addChild(scoreText);

        scoreView.position.x = 60;
        scoreView.position.y = 2;
        frontView.addChild(scoreView);

        buttonsView = new pixi.Container();
        buttonsView.position.x = STAGE_WIDTH;
        buttonsView.position.y = STAGE_HEIGHT;

        soundBtn = new pixi.Sprite(sprites.textures['sound_on']);
        soundBtn.anchor.x = 1;
        soundBtn.anchor.y = 1;
        soundBtn.position.x = -5;
        soundBtn.position.y = -5;

        pauseBtn = new pixi.Sprite(sprites.textures['sound_on']);
        pauseBtn.anchor.x = 1;
        pauseBtn.anchor.y = 1;
        pauseBtn.position.x = -62;
        pauseBtn.position.y = -5;

        buttonsView.addChild(pauseBtn);
        buttonsView.addChild(soundBtn);
        frontView.addChild(buttonsView);

        pauseBtn.interactive = true;
        pauseBtn.on("click", pauseClick);
        pauseBtn.on("touchstart", pauseClick);
        function pauseClick() {
            if (game.finished) {
                game.paused = false;
            } else
                game.paused = !game.paused;
            updateButtons();
        }

        soundBtn.interactive = true;
        soundBtn.on("click", soundClick);
        soundBtn.on("touchstart", soundClick);
        function soundClick() {
            var flag = storage.getItem("sound", "on")=="on";
            storage.setItem("sound", flag?"off":"on");
            updateSound();
            updateButtons();
        }

        function updateSound() {
            var flag = storage.getItem("sound", "on")=="on";
            if (flag) {
                resources.theme.play();
            } else
                resources.theme.pause();
        }

        updateButtons();
        updateSound();
    }

    function updateButtons() {
        var sprites = resources.list['sprites'];
        livesText.text = game.result.lives+"";
        scoreText.text = game.result.score+"";
        soundBtn.texture = sprites.textures[storage.getItem("sound","on")=="off"?"sound_off":"sound_on"];
        pauseBtn.texture = sprites.textures[game.paused ? "play" : "pause"];
    }

    function setupGame() {
        backView = new pixi.Container();
        backTest = new pixi.Container();
        frontView = new pixi.Container();
        frontTest = new pixi.Container();
        switchesView = new pixi.Container();

        webGlView = new pixi.Container();
        webGlView.addChild(backView);
        webGlView.addChild(frontView);

        rawModels = resources.list['shapes'].data;
        for (var key in rawModels) if (rawModels.hasOwnProperty(key)) {
            //loader.add(key, 'assets/' + key + '.png');
            if (rawModels[key][0].filter >= 2 && key.indexOf("crag")<0) {
                rawModels[key][0].filter |= 4;
            }
        }

        gameRes = new GameResources(options, rawModels, resources.list['sprites'].data);
        gameRes.initModels();
        rails = gameRes.rails;
        rails.addVisualStroke({railColor: 0x4B4C52, stickColor: 0xA27B54});
    }

    function easeSin(x) {
        return 0.5 * (1 + Math.sin((x - 0.5)*Math.PI));
    }

    var transAnim = {
        time: 0,
        duration: 2,
        width: 0,
        state: 0,
        start: function() {
            this.state++;
            this.time = 0;
            this.width = level.patches[1].shiftX - level.patches[0].shiftX;
        },
        update: function(dt) {
            this.time += dt;
            if (this.time>this.duration){
                this.state++;
                this.time = this.duration;
            }
            var len = this.width * easeSin(this.time/this.duration);
            //camera.shiftX = (builds[0].shiftX + len);
        },
        complete: function() {
            this.state = 0;
            level.removeBack();
        }
    };

// STAGE MOVER HERE
    var camera = {
        backX: 0,
        shiftX: 0,
        prevPc: 0,
        dirty: false,
        update: function(dt) {
            if (train) {
                var X = train.cars[train.cars.length - 1].position.x;
                if (options.smartCam == 2) {
                    X = way.camX(train.frontWheel().pos + train.frontWheel().rail.coord, STAGE_WIDTH / 3 - 20);
                    var X1 = X - STAGE_WIDTH / 2;
                    if (camera.shiftX < X1)
                        camera.shiftX += dt * 2 * (X1 - camera.shiftX);
                } else {
                    var X1 = X - STAGE_WIDTH / 2;
                    if (camera.shiftX < X1)
                        camera.shiftX = X1;
                }
                if (options.smartCam == 2) {
                    var X1 = X - STAGE_WIDTH / 8;
                    if (X1 < camera.shiftX) {
                        camera.shiftX -= dt * 2 * (camera.shiftX - X1);
                    }
                } else {
                    var X1 = X - STAGE_WIDTH / 2;
                    if (X1 < camera.shiftX)
                        camera.shiftX = X1;
                }
            }
            if (this.dirty || this.shiftX + STAGE_WIDTH >= this.backX + STAGE_WIDTH * STAGE_BUF ||
                this.shiftX <= this.backX) {
                this.backX = Math.floor(this.shiftX - STAGE_WIDTH * (STAGE_BUF-1)/2 );
                this.dirty = false;
                renderBack2();
            }
            if (options.backCanvas != 1) {
                backView.position.x = Math.round(-this.shiftX);
            } else {
                var x = Math.round(this.backX - this.shiftX)/ STAGE_WIDTH ;
                var pc = Math.round(x * 10000) / 100 + "%";
                if (pc != this.prevPc) {
                    canvas[0].style.left = pc;
                    if (options.frontCanvas == 1)
                        canvas[2].style.left = pc;
                    this.prevPc = pc;
                }
            }
            train.position.x = -camera.shiftX;
            obstaclesView.shiftX(camera.shiftX);
            if (options.frontCanvas != 1)
                frontTest.position.x = Math.round(-camera.shiftX);
        }
    }

    function doSmallAction() {
        level.doIt2(500);
    }

    function frame() {
        if (!level || !canvas) {
            //nothing here
            last = time();
            rafId = raf(frame);
            return;
        }
        stats.begin();
        var now = time();
        var ms = now - last;
        var dt = Math.min(ms / 1000, 1);
        last = now;

        debug.visible = level.patches.length<4;
        if (debugView.visible) {
            debugPercent = Math.max(debugPercent, Math.round(level.patches.length / options.lazyPatches * 100));
            debugText.text = debugPercent + "%";
            renderers[1].render(debugView);
            if (level.patches.length >= options.lazyPatches) {
                debugView.visible = false;
            }
            rafId = raf(frame);
            stats.end();
            return;
        } else
        if (debug.visible) {
            //do nothing, show debug.
        } else
        if (transAnim.state == 0) {
            if (way && !game.paused) {
                way.update(dt, camera.shiftX + STAGE_WIDTH+10);
            }
            if (train && !game.paused && !game.finished) {
                var old = game.result.score;
                train.update(dt, options);

                game.result.traveled = train.traveled;
                game.result.traveledTime = train.traveledTime;
                if (!game.paused)
                    game.result.score = Math.round(train.traveled/10);
                if (Math.floor(old/200) < Math.floor(game.result.score / 200)) {
                    tracker.trackGame(game.result, function() {}, function() {});
                }

                if (level.patches[3].paths.indexOf(train.frontWheel().rail.path)>=0) {
                    //transAnim.start();
                    level.removeBack(renderBack);
                } else {
                    doSmallAction();
                }
            }
        } else
        if (transAnim.state == 1) {
            var dt2 = time();
            level.removeBack();
            console.log("remove page" + (time() - dt2) + " ms");
            renderBack();
            console.log("render page " + (time() - dt2) + " ms");
            transAnim.state++;
            last = time();
        } else
        if (transAnim.state == 2) {
            transAnim.update(dt);
            /*if (lastTry + 60 < now) {
             gen.doIt(1, false);
             lastTry = now;
             }*/
        } else if (transAnim.state == 3) {
            transAnim.complete();
            last = time();
        }
        if (!level.callback)
            camera.update(dt);

        if (scoreView) {
            updateButtons();
        }

        if (obstaclesView) {
            obstaclesView.children.sort(function (a, b) {
                var d1 = a.dieIn || 0, d2 = b.dieIn || 0;
                return Math.round((d2-d1)*1000);
            });
            obstaclesView.layers[1].children.sort(function (a, b) {
                var y1 = a.position.y;
                if (a.model) {
                    var c = a.getBounds();
                    y1 = c.y + c.height;
                }
                var y2 = b.position.y;
                if (b.model) {
                    var c = b.getBounds();
                    y1 = c.y + c.height;
                }
                var y = Math.round(y1 - y2);
                if (y!=0) return y;
                return Math.round(a.position.x - b.position.x);
            });
            horn.update();
        }

        renderers[1].render(options.backCanvas!=1?webGlView:frontView);
        stats.end();
        rafId = raf(frame);
    }
    var rafId = raf(frame);

    var obstacleListener = {
        onclick: function(obst) {
            if (!game.finished) {
                game.result.obstacles[obst.typeIndex] = (game.result.obstacles[obst.typeIndex] || 0) + 1;
                //console.log(game.result.obstacles);
            }
            if (obst == obstaclesView.selected) {
                game.paused = false;
                $rootScope.$broadcast("close_tip");
                return true;
            }
            return !game.finished && !game.paused || !buttonsView.visible;
        },
        onshow: function(obst) {
            if (obst.typeName != "delorean" && storage.getItem("tip_"+obst.typeName, "show") == "hide") {
                return;
            }
            if (obst.typeName == "walker") {
                if (horn.popup) return;
                horn.showNow();
            }
            if (obst.showScore) {
                game.result.score=obst.showScore;
                updateButtons();
            }
            storage.setItem("tip_"+obst.typeName, "hide");
            game.paused = true;
            obstaclesView.selected = obst;
            buttonsView.visible = false;
            var unbind = scope.$on("close_tip", function() {
                game.paused = false;
                buttonsView.visible = true;
                obstaclesView.selected = null;
                unbind();
            });
            $rootScope.$broadcast("open_tip", {tip: obst.typeName});
        },
        onend: function(obst) {
            if (game.finished || !scope.finish) return;
            game.finished = true;


            if (obst) {
                game.result.reason = obst.typeName;
                obst.highlight = true;
            }
            else
                game.result.reason = "none";
            var obst = game.result.obstacles;
            game.result.saved_people = obst[0]+obst[1]+obst[2]+obst[3]+obst[4];
            tracker.finishGame(game.result, function(data, status) {
                game.result.place = data.place;
                game.result.livesLeft = data.lives;
                scope.finish(game.result);
            }, function() {
                game.result.place = "connection lost";
                game.result.livesLeft>0?(game.result.livesLeft-1):0
                scope.finish(game.result);
            });
        }
    }


    var STAGE_WIDTH = 800, STAGE_HEIGHT = 480, STAGE_BUF = 1.5;
    var canvas;

    function createCanvas(noEvents) {
        var cnv = document.createElement("canvas");
        cnv.classList.add("game-canvas")
        if (noEvents) {
            cnv.classList.add("no-events");
        }
        game.inner.appendChild(cnv);
        canvas.push(cnv);

        return cnv;
    }

    var useWebGl = false;
    function setupView() {
        canvas = [];
        createCanvas();
        createCanvas();
        if (options.frontCanvas == 1) {
            createCanvas(true);
        }
        for (var i=0; i<canvas.length; i++) {
            canvas[i].style.left = "0%";
            canvas[i].style.top = "0%";
            canvas[i].style.width = i==1?"100%":(Math.round(STAGE_BUF*100)+"%");
            canvas[i].style.height = "100%";
        }

        var w = STAGE_WIDTH, h = STAGE_HEIGHT;
        renderers = [new pixi.CanvasRenderer(STAGE_BUF*w, h, {view: canvas[0], resolution: 1}),
            options.webgl == 1 ? pixi.autoDetectRenderer(w, h, {view: canvas[1], resolution: 1, transparent: options.backCanvas==1, antialias: true}):
                new pixi.CanvasRenderer(w, h, {view: canvas[1], resolution: 1, transparent: true})];
        useWebGl = renderers[1] instanceof pixi.WebGLRenderer;
        if (!useWebGl) {
            options.webgl = 2;
            options.backCanvas = 1;
        }
        if (options.backCanvas != 1)
            canvas[0].style.display = "none";
        if (options.frontCanvas == 1) {
            renderers.push(new pixi.CanvasRenderer(STAGE_BUF*w, h, {view: canvas[2], resolution: 1, transparent: true}));
        }
        renderers[0].backgroundColor = 0x526F35;
    }

    resources.load().then(setupGame);
    //dont stop raf!

    var game = {
        bind: function(domElement, options) {
            this.inner = domElement;
            setOptions(options);
            setupView();
        },
        unbind: function() {
            this.stop();
            this.inner = null;
            this.canvas = null;
        },
        resize: function(sizes) {

        },
        start: function(options, scope1) {
            setOptions(options);
            this.stop();
            scope = scope1;
            resources.load().then(function() {
                if (!level)
                    reset();
            });
        },
        stop: function(scope1) {
            if (scope1 && scope != scope1) return;
            //todo: unbind events from scope?
            scope = null;
            if (level && level.stop) { level.stop(); }
            level = null;
        }
    };
    return game;
};
