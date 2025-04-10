/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * @param {Flow} flow
 * @param {FutureFactory} futureFactory
 * @param {NativeDefinitionBuilder} nativeDefinitionBuilder
 * @param {UserlandDefinitionBuilder} userlandDefinitionBuilder
 * @param {ClassPromoter} classPromoter
 * @constructor
 */
function ClassDefiner(
    flow,
    futureFactory,
    nativeDefinitionBuilder,
    userlandDefinitionBuilder,
    classPromoter
) {
    /**
     * @type {ClassPromoter}
     */
    this.classPromoter = classPromoter;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {NativeDefinitionBuilder}
     */
    this.nativeDefinitionBuilder = nativeDefinitionBuilder;
    /**
     * @type {UserlandDefinitionBuilder}
     */
    this.userlandDefinitionBuilder = userlandDefinitionBuilder;
}

_.extend(ClassDefiner.prototype, {
    /**
     * Defines a class in the given namespace, either from a JS class/function or from a transpiled PHP class,
     * where PHPToJS has generated an object containing all the information related to the class
     *
     * @param {string} name Class name, not including its namespace
     * @param {Function|Object} definition Either a Function for a native JS class or a transpiled definition object
     * @param {Namespace} namespace
     * @param {NamespaceScope} namespaceScope
     * @param {boolean} autoCoercionEnabled Whether the class should be auto-coercing
     * @param {Function|null} methodCaller Custom method call handler
     * @returns {ChainableInterface<Class>} Returns the internal Class instance created
     */
    defineClass: function (
        name,
        definition,
        namespace,
        namespaceScope,
        autoCoercionEnabled,
        methodCaller
    ) {
        var definer = this,
            interfaceObjects;

        return definer.flow
            // Resolve all interfaces implemented by the class.
            .mapAsync(definition.interfaces, function (interfaceName) {
                return namespaceScope.getClass(interfaceName);
            })
            .next(function (interfaceObjectsResult) {
                interfaceObjects = interfaceObjectsResult;

                // Resolve all traits used by the class.
                return definer.flow
                    .mapAsync(definition.traits ? definition.traits.names : [], function (traitName) {
                        return namespaceScope.getTrait(traitName);
                    });
            })
            // Build a definition for the class of the relevant type (native or PHP userland).
            .next(function (traitObjects) {
                if (_.isFunction(definition)) {
                    // Class is defined using native JavaScript, not PHP

                    return definer.nativeDefinitionBuilder.buildDefinition(
                        name,
                        definition,
                        // Native JS classes provide their super class instance directly.
                        definition.superClass,
                        namespace,
                        namespaceScope,
                        interfaceObjects,
                        traitObjects,
                        autoCoercionEnabled,
                        methodCaller
                    );
                }

                // Class has a definition structure, so it was defined using PHP.

                return definer.futureFactory.createFuture(function (resolve) {
                    if (definition.superClass) {
                        // Transpiled PHP-land classes provide the FQCN of their superclass
                        // (note that this will return a Future, to allow for asynchronous handling
                        // such as autoloading in async mode) so resolve it first.
                        resolve(namespaceScope.getClass(definition.superClass));
                        return;
                    }

                    // Class has no superclass.
                    resolve(null);
                }).next(function (superClass) {
                    return definer.userlandDefinitionBuilder.buildDefinition(
                        name,
                        definition,
                        superClass,
                        namespace,
                        namespaceScope,
                        interfaceObjects,
                        traitObjects
                    );
                });
            })
            // Finally, promote the definition to the actual Class instance.
            .next(function (classDefinition) {
                return definer.classPromoter.promoteDefinition(classDefinition);
            });
    }
});

module.exports = ClassDefiner;
