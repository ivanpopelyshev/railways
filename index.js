var express		 	= require('express');
var useragent = require('express-useragent');
var async			= require('async');
var path			= require('path');
var nconf			= require('nconf');
var md5             = require('md5');
var mysql           = require('mysql');
var http            = require('http');

var router 		= express.Router();
var NodeCache 	= require( 'node-cache');
var bodyParser = require('body-parser');

if (process.argv[2]) {
    nconf.file({
        file: process.argv[2]
    });
} else {
    nconf.file({
        file: __dirname + '/dev.json'
    });
}

var db = mysql.createConnection({
    port: nconf.get('db:port') || 3306,
    host: nconf.get('db:host'),
    user: nconf.get('db:user'),
    password: nconf.get('db:password'),
    database: nconf.get('db:database')
});

app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json())
app.set('trust proxy', 'loopback')

config = {
    salt: nconf.get("config:salt"),
    lives: nconf.get("config:lives")
};

app.use(useragent.express());
app.use(function(req, res, next) {
    var id = req.query.uid;
    var nickname = req.query.uname;
    var hash = req.query.key;
    if (id) {
        var expected = md5(id+nickname+config.salt);
        if (hash != expected) {
            console.log("wrong hash for uid="+id+" uname="+nickname+" hash="+hash+" expected=" + expected);
//            res.send(401);
//            return;
        }
        req.user = {
            id: id,
            nickname: nickname
        };
        next();
    } else {
        next();
    }
})

app.post('/api/startGame', function(req, res, next) {
    var user = req.user;
    if (!user) {
        res.sendStatus(401)
        return;
    }
    var ua =  req.useragent;
    //console.log("start game userid="+user.id)

    async.parallel({
        one: function(cb) { db.query('insert into `users`(`id`, `nickname` ) values(?, ?) on duplicate key update nickname=?', [user.id, user.nickname, user.nickname], cb); },
        two: function(cb) { db.query('select count(*) c from `games` where `userId`=? and `date` = CURDATE() and score>0', [user.id], cb); },
        three: function(cb) { db.query('insert into `games`(`userId`, `date`, ' +
            '`agent_isMobile`, `agent_isDesktop`, `agent_browser`, `agent_version`, `agent_os`, `agent_platform`, `agent_ip`) values(?, CURDATE(), ?, ?, ?, ?, ?, ?, ?) ',
                [user.id, ua.isMobile, ua.isDesktop, ua.browser, ua.version, ua.os, ua.platform, req.ip], cb); }
    }, function(err, results) {
        if (err) {
            console.log('error in game start: ', err);
            res.send(500);
        }
        var gameId = results.three[0].insertId;
        var lives = Math.max(0, config.lives - results.two[0][0].c);
        console.log("start game userid="+user.id +" gameid="+gameId+" lives="+lives);
        res.json({ gameId: gameId, lives: lives});
        db.query('update `games` set `lives`=? where `id`=?', [lives, gameId], function(err, rows) {
            if (err) {
                console.log('error while updating lives : ', err);
            }
        });
    });
});

app.post('/api/trackGame', function(req, res, next) {
    var user = req.user;
    if (!user) {
        res.sendStatus(401)
        return;
    }
    var result = req.body;
    var obst = result.obstacles;
    db.query('select * from `games` where id=? and userId=?', [result.gameId, user.id], function(err, rows, fields) {
        if (err) {
            console.log('error while getting game', err);
            res.sendStatus(500);
            return;
        }
        if (rows.length==0) {
            console.log('no such game id='+result.gameId, err);
            res.sendStatus(400);
            return;
        }
        var game = rows[0];
        if (game.finished) {
            console.log('game already finished id='+result.gameId, err);
            res.sendStatus(400);
            return;
        }
        async.parallel([
            function(cb) {
                db.query('update `games` set score=? where id=?', [result.score, result.gameId], cb);
            },
            insertTrack(result)
        ], function(err, results) {
            if (err) {
                console.log('cant insert track', err);
                res.sendStatus(500);
                return;
            }
            res.sendStatus(200);
        })
    });
})

function insertTrack(result) {
    var obst = result.obstacles;
    return function(cb) {
        db.query('insert into `game_tracks`(`gameId`, `score`, `traveled`, `traveledTime`, `reason`, `obst1`, `obst2`, `obst3`, `obst4`, `obst5`, `obst6`)' +
            'values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [result.gameId, result.score, result.traveled, result.traveledTime, result.reason || null, obst[0], obst[1], obst[2], obst[3], obst[4], obst[5], obst[6]], cb);
    }
}

var topPlaces = [];
var userPlaceById = {};

function findPlaceFor(score) {
    var rec = topPlaces.length+1;
    for (var i=0;i<topPlaces.length;i++) {
        if (topPlaces[i].score<=score) {
            rec = i + 1;
            break;
        }
    }
    return rec;
}

function updateUserPlace(userId, lives, score, cb) {
    var ind = userPlaceById[userId] || 0;
    var rec = ind>0 ? topPlaces[ind-1] : null;
    if (lives>0 && (!rec || rec.score < score)) {
        db.query('update users set score=? where id=?', [score, userId], function(err, rows, fields) {
            if (err) return cb(err);
            updatePlaces(function(err) {
                if (err) return cb(err);
                var rec = userPlaceById[userId] || findPlaceFor(score);
                cb(null, {
                    place: rec,
                    score: score,
                    lives: lives-1
                })
            });
        })
    } else {
        var rec = userPlaceById[userId] || findPlaceFor(score);
        cb(null, {
            place: rec,
            score: score,
            lives: Math.max(0, lives-1)
        })
    }
}

function updatePlaces(cb) {
    db.query('select * from users where score>0 and ban=0 order by score desc ', [], function(err, rows, fields) {
        if (err) {
            console.log("oops, cant order users", err);
            return cb(err);
        }
        topPlaces = rows;
        userPlaceById = {};
        var sc = 100000000, place = 0;
        for (var i=0;i<topPlaces.length;i++) {
            if (topPlaces[i].score<sc) {
                sc = topPlaces[i].score;
                place = i+1;
            }
            topPlaces[i].place = place;
            userPlaceById[topPlaces[i].id] = place;
            delete topPlaces[i].id;
        }
        for (var i=0;i<topPlaces.length;i++) {
            topPlaces[i] = {
                nickname: topPlaces[i].nickname,
                score: topPlaces[i].score,
                place: topPlaces[i].place
            }
        }
        cb(null);
    });
}

function insertAnon(req) {
    var result = req.body;
    var obst = result.obstacles;
    var ua =  req.useragent;
    db.query('insert into `games`(`userId`, `finished`, `score`, `date`, ' +
        '`agent_isMobile`, `agent_isDesktop`, `agent_browser`, `agent_version`, `agent_os`, `agent_platform`, `agent_ip`) values(0, 1, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?) ',
        [result.score, ua.isMobile, ua.isDesktop, ua.browser, ua.version, ua.os, ua.platform, req.ip], function(err, res) {
            if (err) {
                console.log("cant insert anon game", err);
                return;
            }
            result.gameId = res.insertId;
            insertTrack(result)(function(err) {
                if (err) {
                    console.log("cant insert anon track", err);
                    return;
                }
            });
        });
}

app.post('/api/finishGame', function(req, res, next) {
    var user = req.user;
    var result = req.body;
    var obst = result.obstacles;
    if (!user) {
        insertAnon(req);
        res.json({ place:findPlaceFor(result.score), score: result.score, lives: 0});
        return;
    }
    //console.log("finish game userid="+user.id+" gameid"+result.gameId)
    db.query('select * from `games` where id=? and userId=?', [result.gameId, user.id], function(err, rows, fields) {
        if (err) {
            console.log('error while getting game', err);
            res.sendStatus(500);
            return;
        }
        if (rows.length==0) {
            console.log('no such game id='+result.gameId, err);
            res.sendStatus(400);
            return;
        }
        var game = rows[0];
        if (game.finished) {
            updateUserPlace(user.id, game.lives, game.score, function(err, usr) {
                if (err) {
                    console.log("error while updating places", err);
                    res.sendStatus(500);
                }
                res.send(usr);
            });
            console.log('game already finished id='+result.gameId, err);
            return;
        }
        async.series([
            function(cb) {
                db.query('update `games` set score=?, finished=1 where id=?', [result.score, result.gameId], cb);
            },
            insertTrack(result)
        ], function(err, results) {
            if (err) {
                console.log('cant insert track', err);
                res.sendStatus(500);
                return;
            }
            updateUserPlace(user.id, game.lives, result.score, function(err, usr) {
                if (err) {
                    console.log("error while updating places", err);
                    res.sendStatus(500);
                }
                res.send(usr);
            })
        })
    });
});

app.get('/api/rating', function(req, res, next) {
    var from = (+req.query.from) || 0;
    var size = (+req.query.size) || 10;
    res.json({from : from, size: size, total: topPlaces.length, list: topPlaces.slice(from, from+size)});
});

//startup sequence
async.series( [updatePlaces],
    function(err, results) {
        if (err) {
            console.log("cant connect to mysql or execute simple query for places", err);
            return;
        }
        //start the server when we have user places
        var server = require('http').Server(app);
        if (server.listen(3025)) console.log("Web server listening localhost:3025");
    });

