/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    util = require('util');

/**
 * Represents a call to a builtin function that needs to abort due to mismatched arguments,
 * but should not result in an error, only a warning.
 *
 * @see {FunctionFactory}
 *
 * @constructor
 */
function WeakBuiltinAbort() {

}

util.inherits(WeakBuiltinAbort, Error);

_.extend(WeakBuiltinAbort.prototype, {

});

module.exports = WeakBuiltinAbort;
