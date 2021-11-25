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
 * Instantiates the shared Runtime
 *
 * @param {class} Environment
 * @param {class} Engine
 * @param {class} PHPState
 * @param {class} Runtime
 * @param {PHPCommon} phpCommon
 * @param {GlobalStackHooker} globalStackHooker
 * @constructor
 */
function RuntimeFactory(
    Environment,
    Engine,
    PHPState,
    Runtime,
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
     * @type {class}
     */
    this.PHPState = PHPState;
    /**
     * @type {class}
     */
    this.Runtime = Runtime;
}

_.extend(RuntimeFactory.prototype, {
    /**
     * Creates a new Runtime instance
     *
     * @param {string} mode
     * @returns {Runtime}
     */
    create: function (mode) {
        var factory = this;

        return new factory.Runtime(
            factory.Environment,
            factory.Engine,
            factory.PHPState,
            factory.phpCommon,
            factory.globalStackHooker,
            mode
        );
    }
});

module.exports = RuntimeFactory;
