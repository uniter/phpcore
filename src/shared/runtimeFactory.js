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
    globalStackHooker = require('./globalStackHooker'),
    phpCommon = require('phpcommon'),
    PHPStateWrapper = require('../PHPState'),
    RuntimeFactory = require('../RuntimeFactory'),
    RuntimeWrapper = require('../Runtime');

module.exports = new RuntimeFactory(
    Environment,
    Engine,
    PHPStateWrapper,
    RuntimeWrapper,
    phpCommon,
    globalStackHooker
);
