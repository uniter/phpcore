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
    require('microdash')
], function (
    _
) {
    /**
     * @param {ClosureFactory} closureFactory
     * @param {ValueFactory} valueFactory
     * @param {NamespaceScope} namespaceScope
     * @param {Function} unwrappedFunction
     * @param {Function} wrappedFunction
     * @param {Scope} enclosingScope
     * @param {ObjectValue|null} thisObject
     * @param {FunctionSpec} functionSpec
     * @constructor
     */
    function Closure(
        closureFactory,
        valueFactory,
        namespaceScope,
        enclosingScope,
        unwrappedFunction,
        wrappedFunction,
        thisObject,
        functionSpec
    ) {
        /**
         * @type {ClosureFactory}
         */
        this.closureFactory = closureFactory;
        /**
         * @type {Scope}
         */
        this.enclosingScope = enclosingScope;
        /**
         * @type {FunctionSpec}
         */
        this.functionSpec = functionSpec;
        /**
         * @type {NamespaceScope}
         */
        this.namespaceScope = namespaceScope;
        /**
         * @type {ObjectValue|null}
         */
        this.thisObject = thisObject;
        /**
         * @type {Function}
         */
        this.unwrappedFunction = unwrappedFunction;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
        /**
         * @type {Function}
         */
        this.wrappedFunction = wrappedFunction;
    }

    _.extend(Closure.prototype, {
        /**
         * Creates a new closure identical to this one,
         * but bound to the specified `$this` object and class scope
         *
         * @param {ObjectValue|NullValue} thisObject
         * @param {Class|undefined} scopeClass
         * @returns {closure.enclosingScope}
         */
        bind: function (thisObject, scopeClass) {
            var closure = this;

            return closure.closureFactory.create(
                closure.enclosingScope,
                closure.unwrappedFunction,
                closure.namespaceScope,
                scopeClass || null,
                thisObject,
                closure.functionSpec
            );
        },

        /**
         * Invokes this closure with the provided arguments, returning its result
         *
         * @param {Value[]} args
         * @param {ObjectValue|undefined} thisObject
         * @returns {Value}
         */
        invoke: function (args, thisObject) {
            // Store the current PHP thisObj to set for the closure
            var closure = this;

            return closure.valueFactory.coerce(
                closure.wrappedFunction.apply(thisObject || closure.thisObject, args)
            );
        }
    });

    return Closure;
}, {strict: true});
