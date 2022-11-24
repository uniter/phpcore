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
    arrayIsFutureMethod = function () {
        return false; // Chainified arrays are present and not Futures.
    },
    createArrayAsValueMethod = function (valueFactory) {
        return function () {
            // Note that `this` will be the Array instance here.
            return valueFactory.createArray(this);
        };
    },

    /**
     * @param {FutureFactory} futureFactory
     * @param {Chainifier} chainifier
     * @returns {Function}
     */
    createArrayNextMethod = function (futureFactory, chainifier) {
        /**
         * Attaches a callback for when the value has been evaluated. As present values
         * are already, this simply calls the resolve handler synchronously and ignores
         * the catch handler as there will never be an error involved here.
         *
         * @param {Function=} resolveHandler
         * @returns {ChainableInterface>}
         */
        return function (resolveHandler) {
            var value = this,
                result;

            if (!resolveHandler) {
                return value;
            }

            try {
                result = resolveHandler(value);
            } catch (error) {
                return futureFactory.createRejection(error);
            }

            result = chainifier.chainify(result);

            return result;
        };
    },
    arrayYieldSyncMethod = function () {
        return this; // The array itself is the present value.
    };

/**
 * @param {ValueFactory} valueFactory
 * @param {FutureFactory} futureFactory
 * @param {Chainifier} chainifier
 * @constructor
 */
function ArrayChainifier(valueFactory, futureFactory, chainifier) {
    /**
     * @type {Chainifier}
     */
    this.chainifier = chainifier;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * Method map to be passed to Object.defineProperties(...) to define all methods in one go for speed.
     * Note that method properties are all non-enumerable to avoid showing up in for...in structures etc.
     *
     * @type {Object}
     */
    this.methodDescriptorMap = {
        asValue: {
            enumerable: false,
            value: createArrayAsValueMethod(valueFactory),
            writable: true
        },
        isFuture: {
            enumerable: false,
            value: arrayIsFutureMethod,
            writable: true
        },
        next: {
            enumerable: false,
            value: createArrayNextMethod(futureFactory, chainifier),
            writable: true
        },
        yieldSync: {
            enumerable: false,
            value: arrayYieldSyncMethod,
            writable: true
        }
    };
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(ArrayChainifier.prototype, {
    /**
     * Makes the given array implement ChainableInterface.
     *
     * Attaches the necessary methods directly to an existing array,
     * to save on GC pressure by avoiding creating a Future instance.
     *
     * Note that the added properties are non-enumerable.
     *
     * @param {Array} array
     * @returns {ChainableInterface<Array>}
     */
    chainify: function (array) {
        var chainifier = this;

        Object.defineProperties(array, chainifier.methodDescriptorMap);

        return array;
    }
});

module.exports = ArrayChainifier;
