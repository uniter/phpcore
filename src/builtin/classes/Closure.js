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
    Promise = require('lie');

module.exports = function (internals) {
    var callFactory = internals.callFactory,
        callStack = internals.callStack,
        controlScope = internals.controlScope,
        errorPromoter = internals.errorPromoter,
        globalNamespace = internals.globalNamespace,
        valueFactory = internals.valueFactory,

        /**
         * Binds a closure to a different $this and/or class scope. Returns a new bound closure,
         * the original is left untouched. Logic shared between ::bind(...) and ->bindTo(...) methods below.
         *
         * @param {ObjectValue} closureValue
         * @param {NullValue|ObjectValue} newThisValue
         * @param {Value} newScopeValue
         * @returns {ChainableInterface<ObjectValue>}
         */
        bind = function (closureValue, newThisValue, newScopeValue) {
            var scopeClassFuture,
                scopeClassName;

            if (newScopeValue.getType() !== 'null') {
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
                // Note that a pending future may be returned due to autoloading.
                scopeClassFuture = globalNamespace.getClass(scopeClassName);
            } else if (newThisValue.getType() !== 'null') {
                scopeClassFuture = internals.createPresent(newThisValue.getClass());
            } else {
                scopeClassFuture = internals.createPresent(null);
            }

            return scopeClassFuture.next(function (scopeClass) {
                return valueFactory.createClosureObject(closureValue.bindClosure(newThisValue, scopeClass));
            });
        };

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
         * Duplicates a closure with a specific bound object and class scope.
         *
         * @see {@link https://secure.php.net/manual/en/closure.bind.php}
         *
         * @param {ObjectValue} closureValue
         * @param {ObjectValue} newThisValue
         * @param {Value} newScopeValue
         */
        'bind': internals.typeStaticMethod('Closure $closure, ?object $newThis, mixed $newScope = "static": ?Closure', function (closureValue, newThisValue, newScopeValue) {
            // TODO: $newScope should be typed as object|string|null above once we support union types.
            return bind(closureValue, newThisValue, newScopeValue);
        }),

        /**
         * Duplicates a closure with a specific bound object and class scope
         *
         * @see {@link https://secure.php.net/manual/en/closure.bindto.php}
         *
         * @param {ObjectValue|Variable|undefined} newThisReference
         * @param {StringValue|Variable|undefined} newScopeReference
         */
        'bindTo': internals.typeInstanceMethod('?object $newThis, mixed $newScope = "static": ?Closure', function (newThisValue, newScopeValue) {
            // TODO: $newScope should be typed as object|string|null above once we support union types.
            var closureValue = this;

            return bind(closureValue, newThisValue, newScopeValue);
        }),

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

            // We are entering PHP-land from JS-land.
            controlScope.enterCoroutine();

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
                return maybeFuture
                    .next(
                        function (resultValue) {
                            // Make sure we resolve the promise with the native result value.
                            return resultValue.getNative();
                        }
                    )
                    .toPromise();
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
