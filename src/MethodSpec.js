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
    IS_STATIC = 'isStatic';

/**
 * @param {Class} originalClass The original class checked against (eg. a derived class for an inherited method)
 * @param {Class} classObject The class the method is actually defined on (may be an ancestor)
 * @param {string} methodName
 * @param {Function} method
 * @constructor
 */
function MethodSpec(originalClass, classObject, methodName, method) {
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {Function}
     */
    this.method = method;
    /**
     * @type {string}
     */
    this.methodName = methodName;
    /**
     * @type {Class}
     */
    this.originalClass = originalClass;
}

_.extend(MethodSpec.prototype, {
    /**
     * Fetches the name of the method this spec is for
     * 
     * @returns {string}
     */
    getMethodName: function () {
        return this.methodName;
    },

    /**
     * Determines whether this method is static (or an instance method)
     *
     * @returns {boolean}
     */
    isStatic: function () {
        return !!this.method[IS_STATIC];
    }
});

module.exports = MethodSpec;
