/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var pausable = require('pausable'),
    phpCommon = require('phpcommon'),
    Engine = require('./src/Engine'),
    Environment = require('./src/Environment'),
    OptionSet = require('./src/OptionSet'),
    PHPState = require('./src/PHPState').async(pausable),
    Runtime = require('./src/Runtime').async(pausable),
    runtime = new Runtime(Environment, Engine, OptionSet, PHPState, phpCommon, pausable);

module.exports = runtime;
