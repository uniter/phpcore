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
    hasOwn = {}.hasOwnProperty,
    phpCommon = require('phpcommon'),
    util = require('util'),
    Exception = phpCommon.Exception,
    FunctionContextInterface = require('./FunctionContextInterface');

/**
 * Represents a PHP closure function
 *
 * @param {NamespaceScope} namespaceScope
 * @param {Class|null} classObject Used when the closure is defined inside a class
 * @param {ObjectValue|null} enclosingObject Used when the closure is defined inside an instance method
 * @param {Object.<string, ReferenceSlot>} referenceBindings
 * @param {Object.<string, Value>} valueBindings
 * @constructor
 * @implements {FunctionContextInterface}
 */
function ClosureContext(
    namespaceScope,
    classObject,
    enclosingObject,
    referenceBindings,
    valueBindings
) {
    /**
     * @type {Class|null}
     */
    this.classObject = classObject;
    /**
     * @type {ObjectValue|null}
     */
    this.enclosingObject = enclosingObject;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * @type {Object<string, ReferenceSlot>}
     */
    this.referenceBindings = referenceBindings;
    /**
     * @type {Object<string, Value>}
     */
    this.valueBindings = valueBindings;
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
     * {@inheritdoc}
     */
    getReferenceBinding: function (name) {
        var context = this;

        if (!hasOwn.call(context.referenceBindings, name)) {
            throw new Exception(
                'ClosureContext.getReferenceBinding() :: Closure has no reference binding for $' + name
            );
        }

        return context.referenceBindings[name];
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
            name = spec.classObject.getName() +
                (spec.enclosingObject ? '->' : '::') +
                name;
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
    },

    /**
     * {@inheritdoc}
     */
    getValueBinding: function (name) {
        var context = this;

        if (!hasOwn.call(context.valueBindings, name)) {
            throw new Exception(
                'ClosureContext.getValueBinding() :: Closure has no value binding for $' + name
            );
        }

        return context.valueBindings[name];
    }
});

module.exports = ClosureContext;
