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
    require('microdash'),
    require('util'),
    require('./String')
], function (
    _,
    util,
    StringValue
) {
    /**
     * Represents an undelimited string, which can resolve relative to the current namespace scope
     * (eg. with "use function", "use {class}" etc.)
     *
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @param {string} value
     * @param {Namespace} globalNamespace
     * @param {NamespaceScope} namespaceScope
     * @constructor
     */
    function BarewordStringValue(
        factory,
        referenceFactory,
        futureFactory,
        callStack,
        flow,
        value,
        globalNamespace,
        namespaceScope
    ) {
        StringValue.call(this, factory, referenceFactory, futureFactory, callStack, flow, value, globalNamespace);

        /**
         * @type {NamespaceScope}
         */
        this.namespaceScope = namespaceScope;
    }

    util.inherits(BarewordStringValue, StringValue);

    _.extend(BarewordStringValue.prototype, {
        call: function (args) {
            var value = this,
                func = value.namespaceScope.getFunction(value.value);

            return func.apply(null, args);
        },

        /**
         * Calls a static method of the class this string refers to
         *
         * @param {StringValue} nameValue
         * @param {Value[]} args
         * @param {bool} isForwarding eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {Future<Value>|Present<Value>}
         */
        callStaticMethod: function (nameValue, args, isForwarding) {
            var value = this;

            // Note that this may pause due to autoloading
            return value.namespaceScope.getClass(value.value)
                .next(function (classObject) {
                    var result = classObject.callMethod(nameValue.getNative(), args, null, null, null, !!isForwarding);

                    return result;
                });
        },

        /**
         * Fetches the fully-qualified version of this name (function or class)
         *
         * @returns {StringValue}
         */
        getCallableName: function () {
            var rightValue = this,
                resolvedClass = rightValue.namespaceScope.resolveClass(rightValue.value);

            return resolvedClass.namespace.getPrefix() + resolvedClass.name;
        },

        /**
         * Fetches the value of a constant from the class this string refers to
         *
         * @param {string} name
         * @returns {Future<Value>|Present<Value>}
         */
        getConstantByName: function (name) {
            var value = this;

            // Note that this may pause due to autoloading
            return value.namespaceScope.getClass(value.value)
                .next(function (classObject) {
                    return classObject.getConstantByName(name);
                });
        },

        /**
         * Fetches the value of a static property of the class this string refers to
         *
         * @param {StringValue} nameValue
         * @returns {Future<Value>|Present<Value>}
         */
        getStaticPropertyByName: function (nameValue) {
            var value = this;

            return value.namespaceScope.getClass(value.value)
                .next(function (classObject) {
                    return classObject.getStaticPropertyByName(nameValue.getNative());
                });
        },

        /**
         * Creates an instance of the class this string contains the name of,
         * relative to the current namespace
         *
         * @param {Value[]} args
         * @returns {Future<ObjectValue>|Present<ObjectValue>}
         */
        instantiate: function (args) {
            var value = this;

            return value.namespaceScope.getClass(value.value)
                .next(function (classObject) {
                    return classObject.instantiate(args);
                });
        },

        /**
         * Determines whether the class this string references is the class of the specified object
         *
         * @param {ObjectValue} objectValue
         * @returns {BooleanValue}
         */
        isTheClassOfObject: function (objectValue) {
            var rightValue = this,
                fqcn = rightValue.getCallableName(rightValue.namespaceScope);

            return rightValue.factory.createBoolean(
                objectValue.classIs(fqcn)
            );
        }
    });

    return BarewordStringValue;
}, {strict: true});
