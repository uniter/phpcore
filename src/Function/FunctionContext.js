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
 * Represents a PHP function
 *
 * @param {NamespaceScope} namespaceScope
 * @param {string} name
 * @constructor
 * @implements {FunctionContextInterface}
 */
function FunctionContext(namespaceScope, name) {
    /**
     * @type {string}
     */
    this.name = name;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
}

util.inherits(FunctionContext, FunctionContextInterface);

_.extend(FunctionContext.prototype, {
    /**
     * Fetches the fully-qualified name of the function (eg. as used by __METHOD__)
     *
     * @returns {string}
     */
    getName: function () {
        var spec = this;

        return spec.namespaceScope.getNamespacePrefix() + spec.name;
    },

    /**
     * Fetches the name of the function as required for stack traces
     *
     * @returns {string}
     */
    getTraceFrameName: function () {
        return this.getName();
    },

    /**
     * Fetches the name of the function
     * (eg. as used by __FUNCTION__)
     *
     * @returns {string}
     */
    getUnprefixedName: function () {
        return this.getName(); // Functions must always be prefixed
    }
});

module.exports = FunctionContext;
