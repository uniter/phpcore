/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/**
 * DebugFormatterInstaller shared service.
 *
 * Allows current & future class dependencies to be added in a single place.
 */

'use strict';

var DebugFactory = require('../Debug/DebugFactory'),
    DebugFormatter = require('../Debug/DebugFormatter'),
    DebugFormatterInstaller = require('../Debug/DebugFormatterInstaller'),
    DebugValue = require('../Debug/DebugValue'),
    ValueFormatter = require('../Debug/ValueFormatter'),
    debugFactory = new DebugFactory(DebugFormatter, DebugValue, ValueFormatter);

module.exports = new DebugFormatterInstaller(global, debugFactory);
