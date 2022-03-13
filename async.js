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

var debugFormatterInstaller = require('./src/shared/debugFormatterInstaller'),
    runtimeFactory = require('./src/shared/runtimeFactory');

debugFormatterInstaller.install();

module.exports = runtimeFactory.create('async');
