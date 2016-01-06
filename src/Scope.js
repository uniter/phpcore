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
    require('./Variable')
], function (
    _,
    Variable
) {
    var hasOwn = {}.hasOwnProperty;

    function Scope(
        callStack,
        superGlobalScope,
        functionFactory,
        valueFactory,
        namespace,
        currentClass,
        currentFunction,
        thisObject
    ) {
        var thisObjectVariable;

        this.callStack = callStack;
        this.currentClass = currentClass;
        this.currentFunction = currentFunction;
        this.errorsSuppressed = false;
        this.functionFactory = functionFactory;
        this.namespace = namespace;
        this.superGlobalScope = superGlobalScope;
        this.thisObject = thisObject;
        this.valueFactory = valueFactory;
        this.variables = {};

        if (thisObject) {
            thisObjectVariable = new Variable(callStack, valueFactory, 'this');
            thisObjectVariable.setValue(thisObject);
            this.variables['this'] = thisObjectVariable;
        }
    }

    _.extend(Scope.prototype, {
        createClosure: function (func) {
            var scope = this;

            return scope.functionFactory.create(
                scope.namespace,
                scope.currentClass,
                scope,
                func
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

        getCurrentClass: function () {
            return this.currentClass;
        },

        getFunctionName: function () {
            var scope = this,
                functionName = '';

            if (scope.currentFunction) {
                functionName = scope.currentFunction.funcName;

                if (!scope.currentClass) {
                    functionName = scope.namespace.getPrefix() + functionName;
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
                    functionName = scope.namespace.getPrefix() + functionName;
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
