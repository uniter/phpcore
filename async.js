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
    DebugFormatter = require('./src/Debug/DebugFormatter'),
    DebugFormatterInstaller = require('./src/Debug/DebugFormatterInstaller'),
    phpCommon = require('phpcommon'),
    Engine = require('./src/Engine'),
    Environment = require('./src/Environment'),
    OptionSet = require('./src/OptionSet'),
    PHPState = require('./src/PHPState').async(pausable),
    Runtime = require('./src/Runtime').async(pausable),
    ValueFormatter = require('./src/Debug/ValueFormatter'),
    runtime = new Runtime(Environment, Engine, OptionSet, PHPState, phpCommon, pausable);

new DebugFormatterInstaller(global, DebugFormatter, ValueFormatter).install();

module.exports = runtime;
