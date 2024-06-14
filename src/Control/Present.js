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
    Promise = require('lie');

/**
 * Represents a lightweight form of Future where the value is already known in advance.
 *
 * @param {FutureFactory} futureFactory
 * @param {Chainifier} chainifier
 * @param {ValueFactory} valueFactory
 * @param {*} value
 * @constructor
 * @implements {FutureInterface}
 */
function Present(
    futureFactory,
    chainifier,
    valueFactory,
    value
) {
    /**
     * @type {Chainifier}
     */
    this.chainifier = chainifier;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {*}
     */
    this.value = value;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(Present.prototype, {
    /**
     * Coerces to a Future (shared interface with Value).
     *
     * @returns {Future}
     */
    asFuture: function () {
        var present = this;

        return present.futureFactory.createFuture(function (resolve) {
            resolve(present.value);
        });
    },

    /**
     * {@inheritdoc}
     */
    asValue: function () {
        var present = this;

        return present.valueFactory.coerce(present.value);
    },

    /**
     * Present values represent a known result, so the handler passed here is never called.
     *
     * @returns {ChainableInterface}
     */
    catch: function () {
        return this;
    },

    /**
     * Present values represent a known result, so the handler passed here is never called.
     *
     * Note that .next()/.catch()/.finally() should usually be used for chaining,
     * this is a low-level function.
     */
    catchIsolated: function () {
        // Nothing to do.
    },

    /**
     * Returns a new ChainableInterface that will have the given text appended to its resolved value.
     *
     * @param {string} text
     * @returns {ChainableInterface<string>}
     */
    concatString: function (text) {
        var present = this;

        return present.futureFactory.createPresent(present.value + text);
    },

    /**
     * Attaches a callback to be called when the value has been evaluated regardless of result or error,
     * returning a new ChainableInterface to be settled as appropriate.
     *
     * @param {Function} finallyHandler
     * @returns {ChainableInterface}
     */
    finally: function (finallyHandler) {
        var present = this,
            result;

        try {
            result = finallyHandler(present.value);
        } catch (error) {
            return present.futureFactory.createRejection(error);
        }

        if (result === undefined) {
            return present.value;
        }

        result = present.chainifier.chainify(result);

        return result;
    },

    /**
     * {@inheritdoc}
     */
    isFuture: function () {
        return true;
    },

    /**
     * {@inheritdoc}
     */
    isPending: function () {
        // As presents are resolved by definition, this always returns false.
        return false;
    },

    /**
     * {@inheritdoc}
     */
    isSettled: function () {
        // As presents are resolved by definition, this always returns true.
        return true;
    },

    /**
     * Attaches a callback for when the value has been evaluated. As presents
     * are already, this simply calls the resolve handler synchronously and ignores
     * the catch handler as there will never be an error involved here.
     *
     * @param {Function=} resolveHandler
     * @returns {ChainableInterface>}
     */
    next: function (resolveHandler) {
        var present = this,
            result;

        if (!resolveHandler) {
            return present;
        }

        try {
            result = resolveHandler(present.value);
        } catch (error) {
            return present.futureFactory.createRejection(error);
        }

        result = present.chainifier.chainify(result);

        return result;
    },

    /**
     * Attaches a callback for when the value has been evaluated. As presents
     * are already, this simply calls the resolve handler synchronously and ignores
     * the catch handler as there will never be an error involved here.
     *
     * Note that:
     *   - This does not return a Value for chaining.
     *   - .next()/.catch()/.finally() should usually be used for chaining,
     *     this is a low-level function.
     *
     * @param {Function=} resolveHandler
     */
    nextIsolated: function (resolveHandler) {
        if (resolveHandler) {
            resolveHandler(this.value);
        }
    },

    /**
     * {@inheritdoc}
     */
    toPromise: function () {
        var present = this;

        return new Promise(function (resolve) {
            resolve(present.value);
        });
    },

    /**
     * Just returns the value of the present, as it is already resolved by definition.
     *
     * @returns {*}
     */
    yield: function () {
        return this.value;
    },

    /**
     * {@inheritdoc}
     */
    yieldSync: function () {
        // Just returns the value of the present, as it is already resolved by definition.
        return this.value;
    }
});

module.exports = Present;
