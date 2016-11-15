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
     * @param {class} Closure
     * @constructor
     */
    function ClosureFactory(
        functionFactory,
        valueFactory,
        Closure
    ) {
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
         * @param {Function} unwrappedFunction
         * @param {NamespaceScope} namespaceScope
         * @param {Class|undefined} scopeClass
         * @param {ObjectValue|NullValue|null} thisObject Null for a static closure, the object to use otherwise
         * @returns {Closure}
         */
        create: function (enclosingScope, unwrappedFunction, namespaceScope, scopeClass, thisObject) {
            var factory = this,
                wrappedFunction;

            // If a bound object is specified but no class scope, use the class of the object
            if (!scopeClass) {
                scopeClass = thisObject && thisObject.getType() !== 'null' ?
                    thisObject.getClass() :
                    null;
            }

            wrappedFunction = factory.functionFactory.create(
                namespaceScope,
                scopeClass,
                unwrappedFunction
            );

            return new factory.Closure(
                factory,
                factory.valueFactory,
                namespaceScope,
                enclosingScope,
                unwrappedFunction,
                wrappedFunction,
                thisObject
            );
        }
    });

    return ClosureFactory;
}, {strict: true});
