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
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception;

/**
 * @param {Internals} baseInternals
 * @param {UnwrapperRepository} unwrapperRepository
 * @param {ValueFactory} valueFactory
 * @param {Namespace} globalNamespace
 * @param {NamespaceScope} globalNamespaceScope
 * @constructor
 */
function ClassInternalsClassFactory(
    baseInternals,
    unwrapperRepository,
    valueFactory,
    globalNamespace,
    globalNamespaceScope
) {
    /**
     * @type {Internals}
     */
    this.baseInternals = baseInternals;
    /**
     * @type {Namespace}
     */
    this.globalNamespace = globalNamespace;
    /**
     * @type {NamespaceScope}
     */
    this.globalNamespaceScope = globalNamespaceScope;
    /**
     * @type {UnwrapperRepository}
     */
    this.unwrapperRepository = unwrapperRepository;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(ClassInternalsClassFactory.prototype, {
    /**
     * Creates a ClassInternals class for use when defining a class using JS
     *
     * @return {class}
     */
    create: function () {
        var factory = this;

        /**
         * @param {string} fqcn
         * @constructor
         */
        function ClassInternals(fqcn) {
            /**
             * @type {string[]}
             */
            this.definedInterfaceNames = [];
            /**
             * @type {boolean}
             */
            this.enableAutoCoercion = true;
            /**
             * @type {string}
             */
            this.fqcn = fqcn;
            /**
             * @type {Class|null}
             */
            this.superClass = null;
            /**
             * @type {Function|null}
             */
            this.unwrapper = null;
        }

        // Extend the base Internals object so we inherit all the public service properties etc.
        ClassInternals.prototype = Object.create(factory.baseInternals);

        _.extend(ClassInternals.prototype, {
            /**
             * Calls the constructor for the superclass of this class, if this class extends another
             *
             * @param {ObjectValue|object} instance Object instance (see below)
             * @param {Value[]|*[]} args Arguments (Value objects if non-coercing, native if coercing)
             * @returns {FutureValue<ObjectValue>|ObjectValue}
             */
            callSuperConstructor: function (instance, args) {
                var argValues,
                    instanceValue,
                    internals = this;

                if (!internals.superClass) {
                    return factory.valueFactory.createRejection(
                        new Exception(
                            'Cannot call superconstructor: no superclass is defined for class "' + internals.fqcn + '"'
                        )
                    );
                }

                if (!args) {
                    args = [];
                }

                /*
                 * If the class is in auto-coercing mode, `instance` will be the native
                 * object value. If the class is in non-coercing mode, `instance` will be
                 * an ObjectValue wrapping the instance, so we need to coerce what we are passed
                 * to make sure it is an ObjectValue as expected by Class.prototype.construct(...).
                 * The same applies to the arguments list.
                 */
                if (internals.enableAutoCoercion) {
                    instanceValue = factory.valueFactory.coerce(instance);

                    argValues = _.map(args, function (nativeArg) {
                        return factory.valueFactory.coerce(nativeArg);
                    });
                } else {
                    instanceValue = instance;
                    argValues = args;
                }

                return internals.superClass.construct(instanceValue, argValues);
            },

            /**
             * Defines the class
             *
             * @param {Function} definitionFactory
             * @returns {Future<Class>}
             */
            defineClass: function (definitionFactory) {
                var internals = this,
                    name,
                    Class = definitionFactory(internals),
                    namespace,
                    // Split the FQCN into a Namespace from its prefix and its name within that namespace
                    // (ie. a FQCN of "My\Stuff\MyClass" gives Namespace<My\Stuff> and name "MyClass")
                    parsed = factory.globalNamespace.parseName(internals.fqcn);

                if (internals.superClass) {
                    Class.superClass = internals.superClass;
                }

                // Add any new interfaces to implement to the class definition
                if (!Class.interfaces) {
                    Class.interfaces = [];
                }
                [].push.apply(Class.interfaces, internals.definedInterfaceNames);

                namespace = parsed.namespace;
                name = parsed.name;

                // Now create the internal Uniter class (an instance of Class)
                // from the PHP class definition information
                return namespace.defineClass(
                    name,
                    Class,
                    factory.globalNamespaceScope,
                    internals.enableAutoCoercion
                ).next(function (classObject) {
                    if (internals.unwrapper) {
                        // Custom unwrappers may be used to eg. unwrap a PHP \DateTime object to a JS Date object
                        factory.unwrapperRepository.defineUnwrapper(classObject, internals.unwrapper);
                    }

                    return classObject;
                });
            },

            /**
             * Defines a custom unwrapper for this class. When an instance of this class
             * is exported to JS-land, the unwrapper will be used to produce the unwrapped value
             *
             * @param {Function} unwrapper
             */
            defineUnwrapper: function (unwrapper) {
                this.unwrapper = unwrapper;
            },

            /**
             * Disables auto-coercion for the class
             */
            disableAutoCoercion: function () {
                this.enableAutoCoercion = false;
            },

            /**
             * Extends another defined class
             *
             * @param {string} fqcn
             */
            extendClass: function (fqcn) {
                // TODO: Confirm that we are ok to disable autoloading here
                //       (not if we are dependent on autoloaders)
                this.superClass = factory.globalNamespace.getClass(fqcn, false).yieldSync();
            },

            /**
             * Implements an interface
             *
             * @param {string} interfaceName
             */
            implement: function (interfaceName) {
                this.definedInterfaceNames.push(interfaceName);
            }
        });

        return ClassInternals;
    }
});

module.exports = ClassInternalsClassFactory;
