/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash')
], function (
    _
) {

    /**
     * @param {class} Callable
     * @param {class} MethodSpec
     * @param {ScopeFactory} scopeFactory
     * @param {CallFactory} callFactory
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @param {ControlBridge} controlBridge
     * @param {ControlScope} controlScope
     * @constructor
     */
    function FunctionFactory(
        Callable,
        MethodSpec,
        scopeFactory,
        callFactory,
        valueFactory,
        callStack,
        flow,
        controlBridge,
        controlScope
    ) {
        /**
         * @type {class}
         */
        this.Callable = Callable;
        /**
         * @type {CallFactory}
         */
        this.callFactory = callFactory;
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {ControlBridge}
         */
        this.controlBridge = controlBridge;
        /**
         * @type {ControlScope}
         */
        this.controlScope = controlScope;
        /**
         * @type {Flow}
         */
        this.flow = flow;
        /**
         * @type {class}
         */
        this.MethodSpec = MethodSpec;
        /**
         * @type {ScopeFactory}
         */
        this.scopeFactory = scopeFactory;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(FunctionFactory.prototype, {

        /**
         * Wraps the specified function in a Callable that handles the PHP call stack and scoping.
         *
         * @param {NamespaceScope} namespaceScope
         * @param {Class|null} currentClass Used by eg. self::
         * @param {ObjectValue|null} currentObject
         * @param {Class|null} staticClass Used by eg. static::
         * @param {FunctionSpec|OverloadedFunctionSpec} functionSpec
         * @returns {Callable}
         */
        createCallable: function (
            namespaceScope,
            currentClass,
            currentObject,
            staticClass,
            functionSpec
        ) {
            var factory = this;

            return new this.Callable(
                factory.scopeFactory,
                factory.callFactory,
                factory.valueFactory,
                factory.callStack,
                factory.flow,
                namespaceScope,
                currentClass,
                currentObject,
                staticClass,
                functionSpec
            );
        },

        /**
         * Creates a new MethodSpec, that describes the specified method of a class
         *
         * @TODO: Replace with FunctionSpec instead?
         *
         * @param {Class} originalClass The original class checked against (eg. a derived class for an inherited method)
         * @param {Class} classObject The class the method is actually defined on (may be an ancestor)
         * @param {string} methodName
         * @param {Function} method
         */
        createMethodSpec: function (originalClass, classObject, methodName, method) {
            return new this.MethodSpec(originalClass, classObject, methodName, method);
        }
    });

    return FunctionFactory;
}, {strict: true});
