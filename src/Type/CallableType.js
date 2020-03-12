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
        return value.isCallable(this.namespaceScope) ||
            (this.allowsNull() && value.getType() === 'null');
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
