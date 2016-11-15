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
    require('./Variable')
], function (
    _,
    phpCommon,
    Variable
) {
    var hasOwn = {}.hasOwnProperty,
        IS_STATIC = 'isStatic',
        PHPFatalError = phpCommon.PHPFatalError;

    function Scope(
        callStack,
        globalScope,
        superGlobalScope,
        closureFactory,
        valueFactory,
        referenceFactory,
        namespaceScope,
        currentClass,
        currentFunction,
        thisObject
    ) {
        var thisObjectVariable = new Variable(callStack, valueFactory, 'this');

        this.callStack = callStack;
        this.closureFactory = closureFactory;
        this.currentClass = currentClass;
        this.currentFunction = currentFunction;
        this.errorsSuppressed = false;
        this.globalScope = globalScope;
        this.namespaceScope = namespaceScope;
        this.referenceFactory = referenceFactory;
        this.superGlobalScope = superGlobalScope;
        this.thisObject = currentFunction && currentFunction[IS_STATIC] ? null : thisObject;
        this.valueFactory = valueFactory;
        this.variables = {
            'this': thisObjectVariable
        };

        if (thisObject && (!currentFunction || !currentFunction[IS_STATIC])) {
            thisObjectVariable.setValue(thisObject);
        }
    }

    _.extend(Scope.prototype, {
        /**
         * Creates a closure, either static (with no `$this` object bound) or non-static
         *
         * @param {Function} func
         * @param {boolean|undefined} isStatic
         * @returns {Closure}
         */
        createClosure: function (func, isStatic) {
            var scope = this,
                thisObject = null;

            // Fetch the `$this` object to bind to the closure from the current scope,
            // if the closure is a normal (non-static) one. Otherwise, if the closure is static
            // then it will have no `$this` object bound to it
            if (!isStatic) {
                thisObject = scope.thisObject;
            }

            return scope.closureFactory.create(
                scope,
                func,
                scope.namespaceScope,
                scope.currentClass,
                thisObject
            );
        },

        defineVariable: function (name) {
            var scope = this,
                variable = new Variable(scope.callStack, scope.valueFactory, name);

            scope.variables[name] = variable;

            return variable;
        },

        defineVariables: function (names) {
            var scope = this;

            _.each(names, function (name) {
                scope.defineVariable(name);
            });
        },

        /**
         * Returns a hash with the values of all variables defined
         * for this scope, including all superglobals
         *
         * @returns {Object.<string, Value>}
         */
        exportVariables: function () {
            var scope = this,
                values = scope.superGlobalScope.exportVariables();

            _.forOwn(scope.variables, function (variable, variableName) {
                if (variable.isDefined()) {
                    values[variableName] = variable.getValue();
                }
            });

            return values;
        },

        expose: function (object, name) {
            var scope = this,
                valueFactory = scope.valueFactory;

            scope.defineVariable(name).setValue(valueFactory.coerce(object));
        },

        getClassName: function () {
            var scope = this;

            return scope.valueFactory.createString(
                scope.currentClass ? scope.currentClass.getName() : ''
            );
        },

        /**
         * Fetches the name of the current class scope
         *
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no current class scope
         */
        getClassNameOrThrow: function () {
            var scope = this;

            if (!scope.currentClass) {
                throw new PHPFatalError(PHPFatalError.SELF_WHEN_NO_ACTIVE_CLASS);
            }

            return scope.valueFactory.createString(scope.currentClass.getName());
        },

        getCurrentClass: function () {
            return this.currentClass;
        },

        getFunctionName: function () {
            var scope = this,
                functionName = '';

            if (scope.currentFunction) {
                functionName = scope.currentFunction.funcName;

                if (!scope.currentClass) {
                    functionName = scope.namespaceScope.getNamespacePrefix() + functionName;
                }
            }

            return scope.valueFactory.createString(functionName);
        },

        getMethodName: function () {
            var scope = this,
                functionName = '';

            if (scope.currentFunction) {
                functionName = scope.currentFunction.funcName;

                if (scope.currentClass) {
                    // Methods are prefixed with namespace, class and `::`
                    functionName = scope.currentClass.getName() + '::' + functionName;
                } else {
                    // Normal functions are prefixed with namespace
                    functionName = scope.namespaceScope.getNamespacePrefix() + functionName;
                }
            }

            return scope.valueFactory.createString(functionName);
        },

        getThisObject: function () {
            return this.thisObject;
        },

        getVariable: function (name) {
            var scope = this,
                variable;

            // Look in the current scope for the variable first
            if (hasOwn.call(scope.variables, name)) {
                return scope.variables[name];
            }

            // If not found, look in the super global scope
            variable = scope.superGlobalScope.getVariable(name);

            if (!variable) {
                // Variable is not local or a super-global: implicitly define it
                variable = new Variable(scope.callStack, scope.valueFactory, name);
                scope.variables[name] = variable;

                if (scope.errorsSuppressed) {
                    variable.setValue(scope.valueFactory.createNull());
                }
            }

            return variable;
        },

        /**
         * Imports a global variable into this scope by defining the variable
         * in this scope and setting its reference to point to the global one.
         *
         * @param {string} variableName
         */
        importGlobal: function (variableName) {
            var scope = this;

            scope.getVariable(variableName).setReference(
                scope.referenceFactory.createVariable(
                    scope.globalScope.getVariable(variableName)
                )
            );
        },

        suppressErrors: function () {
            this.errorsSuppressed = true;
        },

        suppressOwnErrors: function () {
            this.ownErrorsSuppressed = true;
        },

        suppressesErrors: function () {
            return this.errorsSuppressed;
        },

        suppressesOwnErrors: function () {
            return this.ownErrorsSuppressed;
        },

        unsuppressErrors: function () {
            this.errorsSuppressed = false;
        },

        unsuppressOwnErrors: function () {
            this.ownErrorsSuppressed = false;
        }
    });

    return Scope;
}, {strict: true});
