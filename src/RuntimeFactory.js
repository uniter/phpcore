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
    /**
     * Fetches either the sync-mode class (for sync & psync modes) or async-mode class
     *
     * @param {Wrapper} wrapper
     * @param {Resumable=} pausable
     * @returns {Function}
     */
    unwrap = function (wrapper, pausable) {
        return pausable ? wrapper.async(pausable) : wrapper.sync();
    };

/**
 * Instantiates the shared Runtime
 *
 * @param {class} Environment
 * @param {class} Engine
 * @param {Wrapper} PHPStateWrapper
 * @param {Wrapper} RuntimeWrapper
 * @param {PHPCommon} phpCommon
 * @param {GlobalStackHooker} globalStackHooker
 * @constructor
 */
function RuntimeFactory(
    Environment,
    Engine,
    PHPStateWrapper,
    RuntimeWrapper,
    phpCommon,
    globalStackHooker
) {
    /**
     * @type {class}
     */
    this.Engine = Engine;
    /**
     * @type {class}
     */
    this.Environment = Environment;
    /**
     * @type {GlobalStackHooker}
     */
    this.globalStackHooker = globalStackHooker;
    /**
     * @type {PHPCommon}
     */
    this.phpCommon = phpCommon;
    /**
     * @type {Wrapper}
     */
    this.PHPStateWrapper = PHPStateWrapper;
    /**
     * @type {Wrapper}
     */
    this.RuntimeWrapper = RuntimeWrapper;
}

_.extend(RuntimeFactory.prototype, {
    /**
     * Creates a new Runtime instance
     *
     * @param {string} mode
     * @param {Resumable=} pausable
     * @returns {Runtime}
     */
    create: function (mode, pausable) {
        var factory = this,
            PHPState = unwrap(factory.PHPStateWrapper, pausable),
            Runtime = unwrap(factory.RuntimeWrapper, pausable);

        return new Runtime(
            factory.Environment,
            factory.Engine,
            PHPState,
            factory.phpCommon,
            factory.globalStackHooker,
            pausable || null,
            mode
        );
    }
});

module.exports = RuntimeFactory;
