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
 * @param {Environment} Environment
 * @constructor
 */
function EnvironmentFactory(Environment) {
    /**
     * @type {Environment}
     */
    this.Environment = Environment;
}

_.extend(EnvironmentFactory.prototype, {
    /**
     * Creates a new Environment.
     *
     * @param {PHPState} state
     * @returns {Environment}
     */
    createEnvironment: function (state) {
        return new this.Environment(state);
    }
});

module.exports = EnvironmentFactory;
