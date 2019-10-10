/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/**
 * Asynchronous (async) mode entrypoint
 */

'use strict';

var pausable = require('pausable'),
    phpCommon = require('phpcommon'),
    DebugFactory = require('./src/Debug/DebugFactory'),
    DebugFormatter = require('./src/Debug/DebugFormatter'),
    DebugFormatterInstaller = require('./src/Debug/DebugFormatterInstaller'),
    DebugValue = require('./src/Debug/DebugValue'),
    Engine = require('./src/Engine'),
    Environment = require('./src/Environment'),
    PHPState = require('./src/PHPState').async(pausable),
    Runtime = require('./src/Runtime').async(pausable),
    ValueFormatter = require('./src/Debug/ValueFormatter'),
    runtime = new Runtime(Environment, Engine, PHPState, phpCommon, pausable, 'async'),
    debugFactory = new DebugFactory(DebugFormatter, DebugValue, ValueFormatter);

new DebugFormatterInstaller(global, debugFactory).install();

module.exports = runtime;
