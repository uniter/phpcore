/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/**
 * RuntimeFactory shared service.
 *
 * Allows current & future class dependencies to be added in a single place.
 */

'use strict';

var Engine = require('../Engine'),
    Environment = require('../Environment'),
    EnvironmentFactory = require('../Runtime/EnvironmentFactory'),
    globalStackHooker = require('./globalStackHooker'),
    phpCommon = require('phpcommon'),
    PHPState = require('../PHPState').sync(),
    RuntimeFactory = require('../RuntimeFactory'),
    Runtime = require('../Runtime').sync(),
    StateFactory = require('../Runtime/StateFactory'),

    environmentFactory = new EnvironmentFactory(Environment),
    stateFactory = new StateFactory(PHPState, environmentFactory, globalStackHooker);

module.exports = new RuntimeFactory(
    Engine,
    Runtime,
    phpCommon,
    stateFactory
);
