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
    phpCommon = require('phpcommon'),
    util = require('util'),
    Exception = phpCommon.Exception,
    FunctionContextInterface = require('./FunctionContextInterface');

/**
 * Represents a PHP method function.
 *
 * @param {Class} classObject
 * @param {Trait|null} traitObject Trait object if this is a trait method, null otherwise.
 * @param {string} name
 * @constructor
 * @implements {FunctionContextInterface}
 */
function MethodContext(classObject, traitObject, name) {
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {string|null}
     */
    this.name = name;
    /**
     * @type {Trait|null}
     */
    this.traitObject = traitObject;
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
     * {@inheritdoc}
     */
    getReferenceBinding: function () {
        throw new Exception('MethodContext.getReferenceBinding() :: Unsupported');
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
     * @inheritDoc
     */
    getTrait: function () {
        return this.traitObject;
    },

    /**
     * Fetches the name of the method, without any qualifying namespace and/or class prefix
     * (eg. as used by __FUNCTION__)
     *
     * @returns {string}
     */
    getUnprefixedName: function () {
        return this.name;
    },

    /**
     * {@inheritdoc}
     */
    getValueBinding: function () {
        throw new Exception('MethodContext.getValueBinding() :: Unsupported');
    }
});

module.exports = MethodContext;
