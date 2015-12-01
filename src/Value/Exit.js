/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('util'),
    require('../Value')
], function (
    _,
    util,
    Value
) {
    function ExitValue(factory, callStack, statusValue) {
        Value.call(this, factory, callStack, 'exit', null);

        this.statusValue = statusValue;
    }

    util.inherits(ExitValue, Value);

    _.extend(ExitValue.prototype, {
        getStatus: function () {
            var value = this;

            return value.statusValue ? value.statusValue.getNative() : 0;
        }
    });

    return ExitValue;
}, {strict: true});
