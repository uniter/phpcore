/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/**
 * Synchronous (sync) mode entrypoint
 */

'use strict';

var phpCommon = require('phpcommon'),
    DebugFactory = require('./src/Debug/DebugFactory'),
    DebugFormatter = require('./src/Debug/DebugFormatter'),
    DebugFormatterInstaller = require('./src/Debug/DebugFormatterInstaller'),
    DebugValue = require('./src/Debug/DebugValue'),
    Engine = require('./src/Engine'),
    Environment = require('./src/Environment'),
    PHPState = require('./src/PHPState').sync(),
    Runtime = require('./src/Runtime').sync(),
    ValueFormatter = require('./src/Debug/ValueFormatter'),
    runtime = new Runtime(Environment, Engine, PHPState, phpCommon, null, 'sync'),
    debugFactory = new DebugFactory(DebugFormatter, DebugValue, ValueFormatter);

new DebugFormatterInstaller(global, debugFactory).install();

module.exports = runtime;
