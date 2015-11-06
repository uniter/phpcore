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
    require('phpcommon'),
    require('./Value/Array'),
    require('./Value/BarewordString'),
    require('./Value/Boolean'),
    require('./Value/Float'),
    require('./Value/Integer'),
    require('./Value/Null'),
    require('./Value/Object'),
    require('./PHPObject'),
    require('./Value/String'),
    require('./Value')
], function (
    _,
    phpCommon,
    ArrayValue,
    BarewordStringValue,
    BooleanValue,
    FloatValue,
    IntegerValue,
    NullValue,
    ObjectValue,
    PHPObject,
    StringValue,
    Value
) {
    function ValueFactory(pausable, callStack) {
        this.nextObjectID = 1;
        this.callStack = callStack;
        this.globalNamespace = null;
        this.pausable = pausable;
    }

    _.extend(ValueFactory.prototype, {
        coerce: function (value) {
            if (value instanceof Value) {
                return value;
            }

            return this.createFromNative(value);
        },
        createArray: function (value) {
            var factory = this;

            return new ArrayValue(factory, factory.callStack, value);
        },
        createBarewordString: function (value) {
            var factory = this;

            return new BarewordStringValue(factory, factory.callStack, value);
        },
        createBoolean: function (value) {
            var factory = this;

            return new BooleanValue(factory, factory.callStack, value);
        },
        createFloat: function (value) {
            var factory = this;

            return new FloatValue(factory, factory.callStack, value);
        },
        createFromNative: function (nativeValue) {
            var factory = this;

            if (nativeValue === null || typeof nativeValue === 'undefined') {
                return factory.createNull();
            }

            if (_.isString(nativeValue)) {
                return factory.createString(nativeValue);
            }

            if (_.isNumber(nativeValue)) {
                return factory.createInteger(nativeValue);
            }

            if (_.isBoolean(nativeValue)) {
                return factory.createBoolean(nativeValue);
            }

            if (_.isArray(nativeValue)) {
                return factory.createArray(nativeValue);
            }

            return factory.createObject(nativeValue, factory.globalNamespace.getClass('JSObject'));
        },
        createInteger: function (value) {
            var factory = this;

            return new IntegerValue(factory, factory.callStack, value);
        },
        createNull: function () {
            var factory = this;

            return new NullValue(factory, factory.callStack);
        },
        createObject: function (value, classObject) {
            var factory = this;

            // Object ID tracking is incomplete: ID should be freed when all references are lost
            return new ObjectValue(factory, factory.callStack, value, classObject, factory.nextObjectID++);
        },
        createPHPObject: function (object) {
            var factory = this;

            return new PHPObject(factory.pausable, factory, object);
        },
        createString: function (value) {
            var factory = this;

            return new StringValue(factory, factory.callStack, value);
        },
        isValue: function (object) {
            return object instanceof Value;
        },
        setGlobalNamespace: function (globalNamespace) {
            this.globalNamespace = globalNamespace;
        }
    });

    return ValueFactory;
}, {strict: true});
