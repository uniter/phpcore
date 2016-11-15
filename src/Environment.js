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

function Environment(state) {
    this.state = state;
}

_.extend(Environment.prototype, {
    /**
     * Defines a new class (in any namespace)
     *
     * @param {string} name FQCN for the class to define
     * @param {function} definitionFactory Called with `internals` object, returns the class definition
     * @returns {Class} Returns the instance of Class that represents a PHP class
     */
    defineClass: function (name, definitionFactory) {
        return this.state.defineClass(name, definitionFactory);
    },

    defineSuperGlobal: function (name, value) {
        this.state.defineSuperGlobal(name, value);
    },

    defineSuperGlobalAccessor: function (name, valueGetter, valueSetter) {
        this.state.defineSuperGlobalAccessor(name, valueGetter, valueSetter);
    },

    expose: function (object, name) {
        this.state.getGlobalScope().expose(object, name);
    },

    getConstant: function (name) {
        return this.state.getConstant(name);
    },

    getOptions: function () {
        return this.state.getOptions();
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
