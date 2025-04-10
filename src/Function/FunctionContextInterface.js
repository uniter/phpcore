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
 * @interface
 */
function FunctionContextInterface() {
    throw new Error('FunctionContextInterface cannot be instantiated');
}

_.extend(FunctionContextInterface.prototype, {
    /**
     * Fetches the fully-qualified name of the function
     *
     * @param {boolean=} isStaticCall
     * @returns {string}
     */
    getName: throwUnimplemented('getName'),

    /**
     * Fetches a bound variable reference for the function.
     *
     * @param {string} name
     * @returns {ReferenceSlot}
     */
    getReferenceBinding: throwUnimplemented('getReferenceBinding'),

    /**
     * Fetches the name of the function as required for stack traces
     *
     * @param {boolean=} isStaticCall
     * @returns {string}
     */
    getTraceFrameName: throwUnimplemented('getTraceFrameName'),

    /**
     * Fetches the trait object that this method belongs to, or null if it belongs to a class directly.
     *
     * @returns {Trait|null}
     */
    getTrait: throwUnimplemented('getTrait'),

    /**
     * Fetches the name of the function, without any qualifying namespace and/or class prefix
     * (eg. as used by __FUNCTION__)
     *
     * @returns {string}
     */
    getUnprefixedName: throwUnimplemented('getUnprefixedName'),

    /**
     * Fetches a bound variable value for the function.
     *
     * @param {string} name
     * @returns {Value}
     */
    getValueBinding: throwUnimplemented('getValueBinding')
});

module.exports = FunctionContextInterface;
