/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * An opcode resume result used to represent that a pause was not in effect.
 *
 * @constructor
 */
function UnpausedSentinel() {

}

_.extend(UnpausedSentinel.prototype, {

});

module.exports = UnpausedSentinel;
