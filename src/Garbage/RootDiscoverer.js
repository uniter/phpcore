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
 * Discovers all Garbage Collection roots (GC roots).
 *
 * This includes:
 * - Global variables
 * - Superglobal variables
 * - Variables in all current call stack frame scopes
 * - Static class properties
 * - Static function/method variables
 * - Variables in a paused Generator scope
 * - Variables in all call stack frame scopes of a suspended Coroutine (including Fibers)
 *
 * TODO: Implement all of the above.
 *
 * @param {Scope} globalScope
 * @constructor
 */
function RootDiscoverer(globalScope) {
    /**
     * @type {Scope}
     */
    this.globalScope = globalScope;
}

_.extend(RootDiscoverer.prototype, {
    /**
     * Discovers all Garbage Collection roots (GC roots).
     *
     * @returns {Value[]}
     */
    discoverRoots: function () {
        var discoverer = this,
            gcRoots = [];

        // TODO: Fetch from all other sources!

        discoverer.globalScope.getVariables().forEach(function (reference) {
            var outgoingValue = reference.getValueOrNativeNull();

            if (outgoingValue && outgoingValue.isStructured()) {
                gcRoots.push(outgoingValue);
            }
        });

        return gcRoots;
    }
});

module.exports = RootDiscoverer;
