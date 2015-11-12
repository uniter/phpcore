/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var phpCommon = require('phpcommon'),
    Engine = require('./src/Engine'),
    Environment = require('./src/Environment'),
    Runtime = require('./src/Runtime').sync(),
    runtime = new Runtime(Environment, Engine, phpCommon, null);

module.exports = runtime;
