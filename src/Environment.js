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
 * @param {PHPState} state
 * @constructor
 */
function Environment(state) {
    /**
     * @type {PHPState}
     */
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

    /**
     * Defines a global function from a native JS one. If a fully-qualified name is provided
     * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
     *
     * @param {string} name
     * @param {Function} fn
     */
    defineCoercingFunction: function (name, fn) {
        this.state.defineCoercingFunction(name, fn);
    },

    /**
     * Defines a constant with the given native value
     *
     * @param {string} name
     * @param {*} value
     * @param {object} options
     */
    defineConstant: function (name, value, options) {
        this.state.defineConstant(name, value, options);
    },

    /**
     * Defines a global variable and gives it the provided value
     *
     * @param {string} name
     * @param {Value} value
     */
    defineGlobal: function (name, value) {
        this.state.defineGlobal(name, value);
    },

    /**
     * Defines a global variable using a getter/setter pair
     *
     * @param {string} name
     * @param {Function} valueGetter
     * @param {Function} valueSetter
     */
    defineGlobalAccessor: function (name, valueGetter, valueSetter) {
        this.state.defineGlobalAccessor(name, valueGetter, valueSetter);
    },

    /**
     * Defines a global function from a native JS one. If a fully-qualified name is provided
     * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
     *
     * @param {string} name
     * @param {Function} fn
     */
    defineNonCoercingFunction: function (name, fn) {
        this.state.defineNonCoercingFunction(name, fn);
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
