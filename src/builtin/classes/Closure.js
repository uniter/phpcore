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
    PHPError = require('phpcommon').PHPError;

module.exports = function (internals) {
    var callStack = internals.callStack,
        createStaticMethod = function (method) {
            method.isStatic = true;

            return method;
        },
        globalNamespace = internals.globalNamespace,
        valueFactory = internals.valueFactory;

    function Closure() {

    }

    _.extend(Closure.prototype, {
        /**
         * Duplicates a closure with a specific bound object and class scope
         *
         * @see {@link https://secure.php.net/manual/en/closure.bind.php}
         *
         * @param {ObjectValue|Variable} closureReference
         * @param {ObjectValue|Variable|undefined} newThisReference
         * @param {StringValue|Variable|undefined} newScopeReference
         */
        'bind': createStaticMethod(function (closureReference, newThisReference, newScopeReference) {
            var closureValue,
                newScopeValue,
                newThisValue,
                scopeClass,
                scopeClassName;

            if (!closureReference) {
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'Closure::bind() expects at least 2 parameters, 0 given'
                );
                return valueFactory.createNull();
            }

            if (!newThisReference) {
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'Closure::bind() expects at least 2 parameters, 1 given'
                );
                return valueFactory.createNull();
            }

            closureValue = closureReference.getValue();

            if (closureValue.getType() !== 'object' || !closureValue.classIs('Closure')) {
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'Closure::bind() expects parameter 1 to be Closure, ' + closureValue.getType() + ' given'
                );
                return valueFactory.createNull();
            }

            newThisValue = newThisReference.getValue();

            if (newThisValue.getType() !== 'object' && newThisValue.getType() !== 'null') {
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'Closure::bind() expects parameter 2 to be object, ' + newThisValue.getType() + ' given'
                );
                return valueFactory.createNull();
            }

            newScopeValue = newScopeReference ? newScopeReference.getValue() : null;

            if (newScopeValue) {
                if (newScopeValue.getType() === 'object') {
                    // Use object's class as the scope class
                    scopeClassName = newScopeValue.getClassName();
                } else {
                    // For any other type, coerce to string to use as class name
                    // (yes, even integers/floats or resources)
                    scopeClassName = newScopeValue.coerceToString().getNative();
                }
            } else {
                scopeClassName = null;
            }

            // Fetch the class to use as the static scope if specified,
            // otherwise if not specified or "static", use the class of the `$this` object
            if (scopeClassName && scopeClassName !== 'static') {
                scopeClass = globalNamespace.getClass(scopeClassName);
            } else if (newThisValue.getType() !== 'null') {
                scopeClass = newThisValue.getClass();
            } else {
                scopeClass = null;
            }

            return valueFactory.createObject(
                closureValue.bindClosure(newThisValue, scopeClass),
                globalNamespace.getClass('Closure')
            );
        }),

        /**
         * Duplicates a closure with a specific bound object and class scope
         *
         * @see {@link https://secure.php.net/manual/en/closure.bindto.php}
         *
         * @param {ObjectValue|Variable|undefined} newThisReference
         * @param {StringValue|Variable|undefined} newScopeReference
         */
        'bindTo': function (newThisReference, newScopeReference) {
            var closureValue = this,
                newScopeValue,
                newThisValue,
                scopeClass,
                scopeClassName;

            if (!newThisReference) {
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'Closure::bindTo() expects at least 1 parameter, 0 given'
                );
                return valueFactory.createNull();
            }

            newThisValue = newThisReference.getValue();

            if (newThisValue.getType() !== 'object' && newThisValue.getType() !== 'null') {
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'Closure::bindTo() expects parameter 1 to be object, ' + newThisValue.getType() + ' given'
                );
                return valueFactory.createNull();
            }

            newScopeValue = newScopeReference ? newScopeReference.getValue() : null;

            if (newScopeValue) {
                if (newScopeValue.getType() === 'object') {
                    // Use object's class as the scope class
                    scopeClassName = newScopeValue.getClassName();
                } else {
                    // For any other type, coerce to string to use as class name
                    // (yes, even integers/floats or resources)
                    scopeClassName = newScopeValue.coerceToString().getNative();
                }
            } else {
                scopeClassName = null;
            }

            // Fetch the class to use as the static scope if specified,
            // otherwise if not specified or "static", use the class of the `$this` object
            if (scopeClassName && scopeClassName !== 'static') {
                scopeClass = globalNamespace.getClass(scopeClassName);
            } else if (newThisValue.getType() !== 'null') {
                scopeClass = newThisValue.getClass();
            } else {
                scopeClass = null;
            }

            return valueFactory.createObject(
                closureValue.bindClosure(newThisValue, scopeClass),
                globalNamespace.getClass('Closure')
            );
        },

        /**
         * Invokes the closure with the specified arguments, using calling magic.
         *
         * @see {@link http://php.net/manual/en/language.oop5.magic.php#language.oop5.magic.invoke}
         *
         * @returns {Value}
         */
        '__invoke': function () {
            return this.invokeClosure([].slice.call(arguments));
        }
    });

    internals.disableAutoCoercion();

    return Closure;
};
