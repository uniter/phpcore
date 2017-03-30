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
    function BarewordStringValue(factory, callStack, value) {
        StringValue.call(this, factory, callStack, value);
    }

    util.inherits(BarewordStringValue, StringValue);

    _.extend(BarewordStringValue.prototype, {
        call: function (args, namespaceOrNamespaceScope) {
            return namespaceOrNamespaceScope.getFunction(this.value).apply(null, args);
        },

        /**
         * Calls a static method of the class this string refers to
         *
         * @param {StringValue} nameValue
         * @param {Value[]} args
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @param {bool} isForwarding eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {Value}
         */
        callStaticMethod: function (nameValue, args, namespaceOrNamespaceScope, isForwarding) {
            var value = this,
                classObject = namespaceOrNamespaceScope.getClass(value.value);

            return classObject.callMethod(nameValue.getNative(), args, null, null, null, isForwarding);
        },

        /**
         * Fetches the fully-qualified version of this name (function or class)
         *
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {StringValue}
         */
        getCallableName: function (namespaceOrNamespaceScope) {
            var rightValue = this,
                resolvedClass = namespaceOrNamespaceScope.resolveClass(rightValue.value);

            return resolvedClass.namespace.getPrefix() + resolvedClass.name;
        },

        /**
         * Fetches the value of a constant from the class this string refers to
         *
         * @param {string} name
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {Value}
         */
        getConstantByName: function (name, namespaceOrNamespaceScope) {
            var value = this,
                classObject = namespaceOrNamespaceScope.getClass(value.value);

            return classObject.getConstantByName(name);
        },

        /**
         * Fetches the value of a static property of the class this string refers to
         *
         * @param {StringValue} nameValue
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {Value}
         */
        getStaticPropertyByName: function (nameValue, namespaceOrNamespaceScope) {
            var value = this,
                classObject = namespaceOrNamespaceScope.getClass(value.value);

            return classObject.getStaticPropertyByName(nameValue.getNative());
        },

        /**
         * Creates an instance of the class this string contains the name of,
         * relative to the current namespace
         *
         * @param {Value[]} args
         * @param {NamespaceScope} namespaceScope
         * @returns {ObjectValue}
         */
        instantiate: function (args, namespaceScope) {
            var value = this,
                classObject = namespaceScope.getClass(value.value);

            return classObject.instantiate(args);
        },

        /**
         * Determines whether the class this string references is the class of the specified object
         *
         * @param {ObjectValue} objectValue
         * @param {Namespace|NamespaceScope} namespaceOrNamespaceScope
         * @returns {BooleanValue}
         */
        isTheClassOfObject: function (objectValue, namespaceOrNamespaceScope) {
            var rightValue = this,
                fqcn = rightValue.getCallableName(namespaceOrNamespaceScope);

            return rightValue.factory.createBoolean(
                objectValue.classIs(fqcn)
            );
        }
    });

    return BarewordStringValue;
}, {strict: true});
