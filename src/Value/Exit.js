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
    /**
     * A special value that only gets created in response to the "exit" or "die" constructs
     *
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {Value|null} statusValue
     * @constructor
     */
    function ExitValue(
        factory,
        referenceFactory,
        futureFactory,
        callStack,
        statusValue
    ) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, 'exit', null);

        /**
         * @type {Value|null}
         */
        this.statusValue = statusValue;
    }

    util.inherits(ExitValue, Value);

    _.extend(ExitValue.prototype, {
        /**
         * Fetches the exit code, if any, otherwise 0
         *
         * @returns {number}
         */
        getStatus: function () {
            var value = this;

            return value.statusValue ? value.statusValue.getNative() : 0;
        }
    });

    return ExitValue;
}, {strict: true});
