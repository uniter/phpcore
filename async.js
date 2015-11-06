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
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    Engine = require('./src/Engine'),
    Environment = require('./src/Environment'),
    Runtime = require('./src/Runtime').async(pausable),
    runtime = new Runtime(Environment, Engine, phpCommon, pausable, phpToAST, phpToJS);

module.exports = runtime;
