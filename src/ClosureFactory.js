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
     * @param {FunctionFactory} functionFactory
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @param {class} Closure
     * @constructor
     */
    function ClosureFactory(
        functionFactory,
        valueFactory,
        callStack,
        Closure
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {class}
         */
        this.Closure = Closure;
        /**
         * @type {FunctionFactory}
         */
        this.functionFactory = functionFactory;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(ClosureFactory.prototype, {
        /**
         * Creates a new Closure
         *
         * @param {Scope} enclosingScope
         * @param {NamespaceScope} namespaceScope
         * @param {Class|undefined} scopeClass
         * @param {ObjectValue|NullValue|null} thisObject Null for a static closure, the object to use otherwise
         * @param {FunctionSpec} functionSpec
         * @returns {Closure}
         */
        create: function (enclosingScope, namespaceScope, scopeClass, thisObject, functionSpec) {
            var factory = this,
                staticClass,
                wrappedFunction;

            // If a bound object is specified but no class scope, use the class of the object
            if (!scopeClass) {
                scopeClass = thisObject && thisObject.getType() !== 'null' ?
                    thisObject.getClass() :
                    null;
            }

            staticClass = factory.callStack.getStaticClass();

            if (staticClass && staticClass.is('Closure')) {
                // Ignore the special Closure class itself, we do not want to bind to it.
                staticClass = null;
            }

            wrappedFunction = factory.functionFactory.create(
                namespaceScope,
                scopeClass,
                null,
                // Inside a closure, static:: will either refer to the current bound static class
                // or, if none, then the current/owning class of the method that created it.
                staticClass || scopeClass || null,
                functionSpec
            );

            return new factory.Closure(
                factory,
                factory.valueFactory,
                namespaceScope,
                enclosingScope,
                wrappedFunction,
                thisObject,
                functionSpec
            );
        }
    });

    return ClosureFactory;
}, {strict: true});
