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
     * (e.g. with "use function", "use {class}" etc.)
     *
     * Note that global constants will be transpiled as a getConstant() opcode and not a bareword,
     * therefore a bareword is not actually a valid expression term.
     *
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @param {string} value
     * @param {Namespace} globalNamespace
     * @param {NumericStringParser} numericStringParser
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
        numericStringParser,
        namespaceScope
    ) {
        StringValue.call(
            this,
            factory,
            referenceFactory,
            futureFactory,
            callStack,
            flow,
            value,
            globalNamespace,
            numericStringParser
        );

        /**
         * @type {NamespaceScope}
         */
        this.namespaceScope = namespaceScope;
    }

    util.inherits(BarewordStringValue, StringValue);

    _.extend(BarewordStringValue.prototype, {
        /**
         * Calls the function this bareword references.
         *
         * @param {Reference[]|Value[]|Variable[]} args
         * @returns {ChainableInterface<Reference|Value|Variable>}
         */
        call: function (args) {
            var value = this,
                callable = value.namespaceScope.getFunction(value.value);

            return callable.apply(null, args);
        },

        /**
         * Calls a static method of the class this string refers to.
         *
         * @param {StringValue} nameValue
         * @param {Reference[]|Value[]|Variable[]} positionalArgs
         * @param {Object.<string, Reference|Value|Variable>|null} namedArgs
         * @param {bool} isForwarding eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {ChainableInterface<Reference|Value|Variable>}
         */
        callStaticMethod: function (nameValue, positionalArgs, namedArgs, isForwarding) {
            var value = this;

            // Note that this may pause due to autoloading.
            return value.namespaceScope.getClass(value.value)
                .next(function (classObject) {
                    return classObject.callMethod(nameValue.getNative(), positionalArgs, namedArgs, null, null, Boolean(isForwarding));
                });
        },

        /**
         * Fetches the Callable representing the global function this bareword references.
         *
         * Note that as functions cannot be autoloaded, the Callable can simply be returned synchronously.
         *
         * @returns {Callable}
         */
        getCallable: function () {
            var value = this;

            return value.namespaceScope.getFunction(value.value);
        },

        /**
         * Fetches the fully-qualified version of this name (function or class)
         *
         * @returns {string}
         */
        getCallableName: function () {
            var rightValue = this,
                resolvedClass = rightValue.namespaceScope.resolveName(rightValue.value);

            return resolvedClass.namespace.getPrefix() + resolvedClass.name;
        },

        /**
         * Fetches the value of a constant from the class this string refers to.
         *
         * @param {string} name
         * @returns {ChainableInterface<Value>}
         */
        getConstantByName: function (name) {
            var value = this;

            if (name.toLowerCase() === 'class') {
                /*
                 * The special MyClass::class constant that fetches the FQCN of the class as a string.
                 * Note that this constant is case-insensitive while all others are not.
                 *
                 * If the class is not defined, it will not be autoloaded.
                 */
                return value.factory.createString(value.getCallableName());
            }

            // Note that this may pause due to autoloading.
            return value.namespaceScope.getClass(value.value)
                .next(function (classObject) {
                    return classObject.getConstantByName(name);
                });
        },

        /**
         * Fetches a reference to a static property of the class this string refers to.
         *
         * @param {StringValue} nameValue
         * @returns {ChainableInterface<StaticPropertyReference|UndeclaredStaticPropertyReference>}
         */
        getStaticPropertyByName: function (nameValue) {
            var value = this;

            return value.namespaceScope.getClass(value.value)
                .next(function (classObject) {
                    return classObject.getStaticPropertyByName(nameValue.getNative());
                });
        },

        /**
         * {@inheritdoc}
         */
        getUnderlyingType: function () {
            return 'bareword';
        },

        /**
         * Creates an instance of the class this string contains the name of,
         * relative to the current namespace.
         *
         * @param {Reference[]|Value[]} constructorPositionalArgs The wrapped value objects or references to pass as arguments to the constructor.
         * @param {Object.<string, Reference|Value|Variable>=} constructorNamedArgs The named arguments.
         * @returns {ChainableInterface<ObjectValue>}
         */
        instantiate: function (constructorPositionalArgs, constructorNamedArgs) {
            var value = this;

            return value.namespaceScope.getClass(value.value)
                .next(function (classObject) {
                    return classObject.instantiate(constructorPositionalArgs, constructorNamedArgs);
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
