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
 * Instantiates the shared Runtime.
 *
 * @param {class} Engine
 * @param {class} Runtime
 * @param {PHPCommon} phpCommon
 * @param {StateFactory} stateFactory
 * @constructor
 */
function RuntimeFactory(
    Engine,
    Runtime,
    phpCommon,
    stateFactory
) {
    /**
     * @type {class}
     */
    this.Engine = Engine;
    /**
     * @type {PHPCommon}
     */
    this.phpCommon = phpCommon;
    /**
     * @type {class}
     */
    this.Runtime = Runtime;
    /**
     * @type {StateFactory}
     */
    this.stateFactory = stateFactory;
}

_.extend(RuntimeFactory.prototype, {
    /**
     * Creates a new Runtime instance.
     *
     * @param {string} mode
     * @returns {Runtime}
     */
    create: function (mode) {
        var factory = this;

        return new factory.Runtime(
            factory.Engine,
            factory.phpCommon,
            factory.stateFactory,
            mode
        );
    }
});

module.exports = RuntimeFactory;
