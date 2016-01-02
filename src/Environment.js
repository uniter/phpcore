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

function Environment(state, options) {
    this.options = options;
    this.state = state;
}

_.extend(Environment.prototype, {
    expose: function (object, name) {
        this.state.getGlobalScope().expose(object, name);
    },

    getConstant: function (name) {
        return this.state.getConstant(name);
    },

    getOptions: function () {
        return this.options;
    },

    getState: function () {
        return this.state;
    },

    getStderr: function () {
        return this.state.getStderr();
    },

    getStdin: function () {
        return this.state.getStdin();
    },

    getStdout: function () {
        return this.state.getStdout();
    }
});

module.exports = Environment;
