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
    FFIResult = require('../../FFI/Result');

/**
 * @param {FutureFactory} futureFactory
 * @param {ControlBridge} controlBridge
 * @constructor
 */
function Chainifier(futureFactory, controlBridge) {
    /**
     * @type {ArrayChainifier}
     */
    this.arrayChainifier = null;
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
}

_.extend(Chainifier.prototype, {
    /**
     * Returns the provided Chainable or wraps any other value in a Future to provide
     * a consistent chainable interface.
     *
     * @param {ChainableInterface|*} value
     * @returns {ChainableInterface}
     */
    chainify: function (value) {
        var chainifier = this;

        if (chainifier.controlBridge.isChainable(value)) {
            return value;
        }

        if (value instanceof FFIResult) {
            return value.resolve();
        }

        if (_.isArray(value)) {
            return chainifier.arrayChainifier.chainify(value);
        }

        return chainifier.futureFactory.createPresent(value);
    },

    /**
     * Injects the ArrayChainifier. Solves a circular dependency issue,
     * as ArrayChainifier needs to be able to recurse back here into Chainifier.
     *
     * @param {ArrayChainifier} arrayChainifier
     */
    setArrayChainifier: function (arrayChainifier) {
        this.arrayChainifier = arrayChainifier;
    }
});

module.exports = Chainifier;
