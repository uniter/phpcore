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
    PHPError = require('phpcommon').PHPError,
    Promise = require('lie');

module.exports = function (internals) {
    var callFactory = internals.callFactory,
        callStack = internals.callStack,
        createStaticMethod = function (method) {
            method.isStatic = true;

            return method;
        },
        errorPromoter = internals.errorPromoter,
        globalNamespace = internals.globalNamespace,
        valueFactory = internals.valueFactory;

    /**
     * Class used to represent anonymous functions or "closures"
     *
     * @see {@link https://secure.php.net/manual/en/class.closure.php}
     * @see {@link https://secure.php.net/manual/en/closure.construct.php}
     *
     * @constructor
     */
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
                scopeClass = globalNamespace.getClass(scopeClassName).yieldSync();
            } else if (newThisValue.getType() !== 'null') {
                scopeClass = newThisValue.getClass();
            } else {
                scopeClass = null;
            }

            return valueFactory.createClosureObject(closureValue.bindClosure(newThisValue, scopeClass));
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
                scopeClass = globalNamespace.getClass(scopeClassName).yieldSync();
            } else if (newThisValue.getType() !== 'null') {
                scopeClass = newThisValue.getClass();
            } else {
                scopeClass = null;
            }

            return valueFactory.createClosureObject(closureValue.bindClosure(newThisValue, scopeClass));
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

    /**
     * This unwrapper will be used when an instance of this builtin PHP class Closure
     * is returned from PHP-land to JS-land. We need to export a callable native JS function
     * so that JS-land code can neatly call into the PHP-land closure like this.
     */
    internals.defineUnwrapper(function (objectValue) {
        var closure = objectValue.getInternalProperty('closure');

        // Unwrap PHP Closures to native JS functions that may be called
        // just like any other (with arguments coerced from JS->PHP
        // and the return value coerced from PHP->JS automatically)
        return function __uniterInboundStackMarker__() {
            var maybeFuture,
                // Wrap thisObj in *Value object
                thisObj = valueFactory.coerceObject(this),
                // Wrap all native JS values in *Value objects
                args = valueFactory.coerceList(arguments);

            // Push an FFI call onto the stack, representing the call from JavaScript-land
            callStack.push(callFactory.createFFICall(args));

            function popFFICall() {
                callStack.pop();
            }

            maybeFuture = closure.invoke.apply(closure, [args, thisObj])
                // Pop the call off the stack _before_ returning, to mirror sync mode's behaviour
                .finally(popFFICall)
                .catch(function (error) {
                    if (valueFactory.isValue(error) && error.getType() === 'object') {
                        // Method threw a PHP Throwable, so throw a native JS error for it

                        // Feed the error into the ErrorReporting mechanism,
                        // so it will be written to stdout/stderr as applicable
                        throw errorPromoter.promote(error);
                    }

                    // Normal error: just pass it up to the caller
                    throw error;
                });

            if (internals.mode === 'async') {
                return new Promise(function (resolve, reject) {
                    maybeFuture.next(
                        function (resultValue) {
                            // Make sure we resolve the promise with the native result value
                            resolve(resultValue.getNative());
                        },
                        reject
                    );
                });
            }

            if (internals.mode === 'psync') {
                // For Promise-synchronous mode, we need to return a promise
                // even though the actual invocation must return synchronously
                return new Promise(function (resolve) {
                    // Use executor so that any error is caught and rejects the promise
                    resolve(maybeFuture.yieldSync().getNative());
                });
            }

            // Otherwise we're in sync mode
            return maybeFuture.yieldSync().getNative();
        };
    });

    return Closure;
};
