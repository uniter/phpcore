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
 * Represents a PHP closure function
 *
 * @param {NamespaceScope} namespaceScope
 * @param {Class|null} classObject Used when the closure is defined inside a class
 * @constructor
 * @implements {FunctionContextInterface}
 */
function ClosureContext(namespaceScope, classObject) {
    /**
     * @type {Class|null}
     */
    this.classObject = classObject;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
}

util.inherits(ClosureContext, FunctionContextInterface);

_.extend(ClosureContext.prototype, {
    /**
     * Fetches the fully-qualified name of the closure (eg. as used by __METHOD__)
     *
     * @returns {string}
     */
    getName: function () {
        return this.namespaceScope.getNamespacePrefix() + '{closure}';
    },

    /**
     * Fetches the name of the closure as required for stack traces
     *
     * @returns {string}
     */
    getTraceFrameName: function () {
        var spec = this,
            name = spec.namespaceScope.getNamespacePrefix() + '{closure}';

        if (spec.classObject) {
            name = spec.classObject.getName() + '::' + name;
        }

        return name;
    },

    /**
     * Fetches the name of the closure, without any qualifying class prefix
     * (eg. as used by __FUNCTION__).
     * NB1: the namespace prefix is intentionally always included
     * NB2: the class (if set) is intentionally never included
     *
     * @returns {string}
     */
    getUnprefixedName: function () {
        return this.namespaceScope.getNamespacePrefix() + '{closure}';
    }
});

module.exports = ClosureContext;
