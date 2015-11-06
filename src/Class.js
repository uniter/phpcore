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
    require('./Reference/StaticProperty')
], function (
    _,
    phpCommon,
    StaticPropertyReference
) {
    var IS_STATIC = 'isStatic',
        VALUE = 'value',
        VISIBILITY = 'visibility',
        hasOwn = {}.hasOwnProperty,
        PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError;

    function Class(
        valueFactory,
        callStack,
        name,
        constructorName,
        InternalClass,
        staticPropertiesData,
        constants,
        superClass,
        interfaceNames,
        namespaceScope
    ) {
        var classObject = this,
            staticProperties = {};

        this.callStack = callStack;
        this.constants = constants;
        this.constructorName = constructorName;
        this.interfaceNames = interfaceNames || [];
        this.InternalClass = InternalClass;
        this.name = name;
        this.namespaceScope = namespaceScope;
        this.staticProperties = staticProperties;
        this.superClass = superClass;
        this.valueFactory = valueFactory;

        _.each(staticPropertiesData, function (data, name) {
            staticProperties[name] = new StaticPropertyReference(classObject, name, data[VISIBILITY], data[VALUE]);
        });
    }

    _.extend(Class.prototype, {
        callStaticMethod: function (name, args) {
            var classObject = this,
                defined = true,
                method,
                prototype = classObject.InternalClass.prototype,
                otherPrototype;

            // Allow methods inherited via the prototype chain up to but not including Object.prototype
            if (!hasOwn.call(prototype, name)) {
                otherPrototype = prototype;

                do {
                    otherPrototype = Object.getPrototypeOf(otherPrototype);
                    if (!otherPrototype || otherPrototype === Object.prototype) {
                        defined = false;
                        break;
                    }
                } while (!hasOwn.call(otherPrototype, name));
            }

            method = prototype[name];

            if (!defined || !_.isFunction(method)) {
                throw new PHPFatalError(PHPFatalError.CALL_TO_UNDEFINED_METHOD, {
                    className: classObject.name,
                    methodName: name
                });
            }

            if (!method[IS_STATIC]) {
                classObject.callStack.raiseError(PHPError.E_STRICT, 'Non-static method ' + method.data.classObject.name + '::' + name + '() should not be called statically');
            }

            return classObject.valueFactory.coerce(method.apply(null, args));
        },

        extends: function (superClass) {
            var classObject = this;

            return classObject.superClass && (classObject.superClass.name === superClass.name || classObject.superClass.extends(superClass));
        },

        getConstantByName: function self(name) {
            var classObject = this,
                i,
                interfaceObject;

            if (hasOwn.call(classObject.constants, name)) {
                return classObject.constants[name]();
            }

            if (classObject.superClass) {
                return classObject.superClass.getConstantByName(name);
            }

            for (i = 0; i < classObject.interfaceNames.length; i++) {
                interfaceObject = classObject.namespaceScope.getClass(classObject.interfaceNames[i]);

                try {
                    return interfaceObject.getConstantByName(name);
                } catch (e) {
                    console.log('hmm');
                }
            }

            throw new PHPFatalError(PHPFatalError.UNDEFINED_CLASS_CONSTANT, {
                name: name
            });
        },

        getInternalClass: function () {
            return this.InternalClass;
        },

        getName: function () {
            return this.name;
        },

        getUnprefixedName: function () {
            return this.name.replace(/^.*\\/, '');
        },

        getStaticPropertyByName: function (name) {
            var classObject = this,
                currentClass,
                staticProperty;

            if (!hasOwn.call(classObject.staticProperties, name)) {
                throw new PHPFatalError(PHPFatalError.UNDECLARED_STATIC_PROPERTY, {
                    className: classObject.name,
                    propertyName: name
                });
            }

            staticProperty = classObject.staticProperties[name];

            // Property is private; may only be read from methods of this class and not derivatives
            if (staticProperty.getVisibility() === 'private') {
                currentClass = classObject.callStack.getCurrent().getScope().getCurrentClass();

                if (!currentClass || currentClass.name !== classObject.name) {
                    throw new PHPFatalError(PHPFatalError.CANNOT_ACCESS_PROPERTY, {
                        className: classObject.name,
                        propertyName: name,
                        visibility: 'private'
                    });
                }
                // Property is protected; may be read from methods of this class and methods of derivatives
            } else if (staticProperty.getVisibility() === 'protected') {
                currentClass = classObject.callStack.getCurrent().getScope().getCurrentClass();

                if (!currentClass || (classObject.name !== currentClass.name && !currentClass.extends(classObject))) {
                    throw new PHPFatalError(PHPFatalError.CANNOT_ACCESS_PROPERTY, {
                        className: classObject.name,
                        propertyName: name,
                        visibility: 'protected'
                    });
                }
            }

            return staticProperty;
        },

        hasStaticPropertyByName: function (name) {
            return hasOwn.call(this.staticProperties, name);
        },

        instantiate: function (args) {
            var classObject = this,
                nativeObject = new classObject.InternalClass(),
                objectValue = classObject.valueFactory.createObject(nativeObject, classObject);

            if (classObject.constructorName) {
                objectValue.callMethod(classObject.constructorName, args);
            }

            return objectValue;
        }
    });

    return Class;
}, {strict: true});
