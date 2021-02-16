/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/**
 * "Promise-synchronous" (psync) mode entrypoint
 *
 * Allows the public API to be Promise-based even when not using Pausable,
 * so that switching to/from async mode does not require changes to the consuming application.
 */

'use strict';

var debugFormatterInstaller = require('./src/shared/debugFormatterInstaller'),
    runtimeFactory = require('./src/shared/runtimeFactory');

debugFormatterInstaller.install();

module.exports = runtimeFactory.create('psync');
