/**
 * Created by Liza on 02.08.2015.
 */

module.exports = {
    // These will be mixed to be made publicly available,
    // while this module is used internally in core
    // to avoid circular dependencies and cut down on
    // internal module requires.

    AABB: require('./AABB'),
    Builder: require('./Builder'),
    FieldObject: require('./FieldObject'),
    Generator: require('./Generator'),
    Buffer: require('./Buffer'),
    Grid: require('./Grid'),
    Level: require('./Level'),
    Path: require('./Path'),
    Rails: require('./Rails'),
    Switch: require('./Switch'),
    Tracker: require('./Tracker'),
    TrainWay: require('./TrainWay'),
    WayTracker: require('./WayTracker'),
    GameResources: require('./GameResources'),
    Point: require('./pixi/Point'),
    Rectangle: require('./pixi/Rectangle'),
    setOptionDefaults: function(options) {
        options.width = options.width || 1200;
        options.height = options.height || 720;
        options.wayLen = options.wayLen || 150;
        options.trainStartSpeed = options.trainStartSpeed || 100;
        options.trainMaxSpeed = options.trainMaxSpeed || 100;
        options.trainRandomWaySpeed = options.trainRandomWaySpeed || 100;
        options.trainDistanceBeforeMaxSpeed = options.trainDistanceBeforeMaxSpeed || 10000;
        options.trainTraction = options.trainTraction || 2;
        options.showTipDistance = options.showTipDistance || 100;
        options.startWays = options.startWays || 1;
        options.minWays = options.minWays || 1;
        options.maxWays = options.maxWays || 1;
        options.lazyPatches = options.lazyPatches || 7;
        options.smartCam = options.smartCam || 2;
        options.frontCanvas = options.frontCanvas || 2;
        options.backCanvas = options.backCanvas || 1;
        options.webworker = options.webworker || 1;
        options.railsSize = options.railsSize || 2;
        options.topOffset = options.topOffset || 40;
        options.bottomOffset = options.bottomOffset || 25;
        options.webgl = options.webgl || 1;
        options.obstacles = options.obstacles || 1;
        options.randomWay = options.randomWay || 1;
        options.endStation = options.endStation || 0.5;
        options.endStationCoeff = options.endStationCoeff || 200;
        return options;
    }
};
