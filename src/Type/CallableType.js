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
    TypeInterface = require('./TypeInterface');

/**
 * Represents a type that can only accept a callable value:
 * - An array callable for calling an instance object method (eg. `[$myInstance, 'myMethod']`)
 * - An array callable for calling a static method (eg. `['My\Lib\MyClass', 'myStaticMethod']`)
 * - A function name as a string
 * - A static method as a string (eg. `'My\Lib\MyClass::myStaticMethod'`)
 * - A Closure instance
 *
 * @param {NamespaceScope} namespaceScope
 * @param {boolean} nullIsAllowed
 * @constructor
 */
function CallableType(namespaceScope, nullIsAllowed) {
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * Note that whether a type is nullable is not directly to whether a parameter using that type is nullable -
     * if the default value is null then it will allow null, which is checked in the Parameter class.
     *
     * @type {boolean}
     */
    this.nullIsAllowed = nullIsAllowed;
}

util.inherits(CallableType, TypeInterface);

_.extend(CallableType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsNull: function () {
        var typeObject = this;

        return typeObject.nullIsAllowed;
    },

    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        var typeObject = this;

        return value.isCallable(typeObject.namespaceScope.getGlobalNamespace())
            .next(function (isCallable) {
                return isCallable || (typeObject.allowsNull() && value.getType() === 'null');
            });
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        return value; // No special coercion to perform.
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'callable';
    },

    /**
     * {@inheritdoc}
     */
    getExpectedMessage: function () {
        return this.getDisplayName();
    },

    /**
     * {@inheritdoc}
     */
    isScalar: function () {
        return false; // This is not a scalar type hint
    }
});

module.exports = CallableType;
