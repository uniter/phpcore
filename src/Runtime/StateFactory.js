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
 * @param {class} PHPState
 * @param {EnvironmentFactory} environmentFactory
 * @param {GlobalStackHooker} globalStackHooker
 * @constructor
 */
function StateFactory(PHPState, environmentFactory, globalStackHooker) {
    /**
     * @type {EnvironmentFactory}
     */
    this.environmentFactory = environmentFactory;
    /**
     * @type {GlobalStackHooker}
     */
    this.globalStackHooker = globalStackHooker;
    /**
     * @type {class}
     */
    this.PHPState = PHPState;
}

_.extend(StateFactory.prototype, {
    /**
     * Creates a new PHPState.
     *
     * @param {Runtime} runtime
     * @param {Object} builtins
     * @param {Stream} stdin
     * @param {Stream} stdout
     * @param {Stream} stderr
     * @param {string} mode
     * @param {Function[]} optionGroups
     * @param {Object} options
     * @returns {PHPState}
     */
    createState: function (
        runtime,
        builtins,
        stdin,
        stdout,
        stderr,
        mode,
        optionGroups,
        options
    ) {
        var factory = this;

        return new factory.PHPState(
            runtime,
            factory.environmentFactory,
            factory.globalStackHooker,
            builtins,
            stdin,
            stdout,
            stderr,
            mode,
            optionGroups,
            options
        );
    }
});

module.exports = StateFactory;
