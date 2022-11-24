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
    throwUnimplemented = function (functionName) {
        return function () {
            throw new Error(functionName + '() :: Not implemented');
        };
    };

/**
 * Represents a value that should eventually resolve to a certain type.
 * Note that it may also be rejected and result in an error.
 *
 * @interface
 */
function ChainableInterface() {
    throw new Error('ChainableInterface cannot be instantiated');
}

_.extend(ChainableInterface.prototype, {
    /**
     * Coerces the eventual result to a Value.
     *
     * @returns {ChainableInterface<Value>}
     */
    asValue: throwUnimplemented('asValue'),

    /**
     * Determines whether this value is a future.
     *
     * @returns {boolean}
     */
    isFuture: throwUnimplemented('isFuture'),

    /**
     * Attaches callbacks for when the value has been evaluated to either a result or error,
     * returning a new ChainableInterface to be settled as appropriate.
     *
     * @param {Function=} resolveHandler
     * @param {Function=} catchHandler
     * @returns {ChainableInterface}
     */
    next: throwUnimplemented('next'),

    /**
     * Fetches the present value synchronously, which is not possible for an unsettled future.
     *
     * @returns {*} When the future was resolved
     * @throws {Error} When the future was rejected
     * @throws {Exception} When the future is still pending
     */
    yieldSync: throwUnimplemented('yieldSync')
});

module.exports = ChainableInterface;
