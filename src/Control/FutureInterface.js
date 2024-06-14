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
 * @extends {ChainableInterface}
 */
function FutureInterface() {
    throw new Error('FutureInterface cannot be instantiated');
}

_.extend(FutureInterface.prototype, {
    /**
     * Determines whether this future is pending (not yet settled by being resolved or rejected).
     *
     * @returns {boolean}
     */
    isPending: throwUnimplemented('isPending'),

    /**
     * Determines whether this future has settled (been resolved or rejected).
     *
     * @returns {boolean}
     */
    isSettled: throwUnimplemented('isSettled')
});

module.exports = FutureInterface;
