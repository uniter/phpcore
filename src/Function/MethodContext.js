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
    util = require('util'),
    FunctionContextInterface = require('./FunctionContextInterface');

/**
 * Represents a PHP method function
 *
 * @param {Class} classObject
 * @param {string|null} name
 * @constructor
 * @implements {FunctionContextInterface}
 */
function MethodContext(classObject, name) {
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {string|null}
     */
    this.name = name;
}

util.inherits(MethodContext, FunctionContextInterface);

_.extend(MethodContext.prototype, {
    /**
     * Fetches the fully-qualified name of the method
     *
     * @param {boolean=} isStaticCall
     * @returns {string}
     */
    getName: function (isStaticCall) {
        var spec = this;

        return spec.classObject.getName() + (isStaticCall !== false ? '::' : '->') + spec.name;
    },

    /**
     * Fetches the name of the method as required for stack traces
     *
     * @param {boolean=} isStaticCall
     * @returns {string}
     */
    getTraceFrameName: function (isStaticCall) {
        return this.getName(isStaticCall);
    },

    /**
     * Fetches the name of the method, without any qualifying namespace and/or class prefix
     * (eg. as used by __FUNCTION__)
     *
     * @returns {string}
     */
    getUnprefixedName: function () {
        return this.name;
    }
});

module.exports = MethodContext;
