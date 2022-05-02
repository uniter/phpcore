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
    var MAGIC_AUTOLOAD_FUNCTION = '__autoload';

    /**
     * Handles autoloading of PHP classes.
     *
     * @param {ValueFactory} valueFactory
     * @param {Flow} flow
     * @constructor
     */
    function ClassAutoloader(valueFactory, flow) {
        /**
         * @type {Flow}
         */
        this.flow = flow;
        /**
         * @type {Namespace|null}
         */
        this.globalNamespace = null;
        /**
         * Once the SPL autoloader stack has been initialised with spl_autoload_register(...),
         * callable values (Closures, function names, static method names etc.) may be registered.
         *
         * @type {Value[]|null}
         */
        this.splStack = null;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(ClassAutoloader.prototype, {
        /**
         * Adds a callable autoloader function to the end of the SPL autoloader stack.
         * If the SPL stack has not yet been initialised then it will be.
         *
         * @param {Value} autoloadCallableValue
         */
        appendAutoloadCallable: function (autoloadCallableValue) {
            var autoloader = this,
                splStack = autoloader.splStack;

            if (!splStack) {
                splStack = [];
                autoloader.splStack = splStack;
            }

            splStack.push(autoloadCallableValue);
        },

        /**
         * Attempts to autoload the specified class
         *
         * @param {string} name
         * @returns {Value} Usually returns Value<null>, any userland autoloader return value is ignored
         *                  but a FutureValue will be awaited, allowing for any async operation
         */
        autoloadClass: function (name) {
            var autoloader = this,
                globalNamespace = autoloader.globalNamespace,
                magicAutoloadFunction,
                splStack = autoloader.splStack;

            if (splStack) {
                // spl_autoload_register(...) was used, so the SPL autoloader stack was initialised

                return autoloader.flow.eachAsync(splStack, function (autoloadCallable) {
                    return autoloadCallable.call([autoloader.valueFactory.createString(name)], globalNamespace)
                        .getValue()
                        .asFuture() // We must switch to a future, because we sometimes resolve with a scalar just below
                        .next(function () {
                            if (globalNamespace.hasClass(name)) {
                                // Autoloader has defined the class: no need to call any further autoloaders
                                return false;
                            }
                        });
                })
                    .asValue();
            }

            // TODO: Legacy __autoload(...) is removed in PHP 8
            magicAutoloadFunction = globalNamespace.getOwnFunction(MAGIC_AUTOLOAD_FUNCTION);

            if (magicAutoloadFunction) {
                return magicAutoloadFunction(autoloader.valueFactory.createString(name))
                    .asValue();
            }

            // No autoloader is registered
            return autoloader.valueFactory.createNull();
        },

        /**
         * Removes the given callable autoloader function from the SPL stack.
         *
         * @param {Value} autoloadCallableValue
         * @returns {FutureValue<BooleanValue>|BooleanValue}
         */
        removeAutoloadCallable: function (autoloadCallableValue) {
            var autoloader = this,
                found = false,
                splStack = autoloader.splStack;

            if (!splStack) {
                // SPL stack has not been enabled: nothing to do
                return autoloader.valueFactory.createBoolean(false);
            }

            return autoloader.flow.eachAsync(splStack, function (existingAutoloadCallable, index) {
                // Callables may be different value types or different objects,
                // so compare using the *Value API.
                return existingAutoloadCallable.isEqualTo(autoloadCallableValue)
                    .asEventualNative()
                    .next(function (isEqual) {
                        if (isEqual) {
                            found = true;
                            splStack.splice(index, 1);
                            return false;
                        }
                    });
            })
                .next(function () {
                    return found;
                })
                .asValue();
        },

        /**
         * Injects the global namespace. Required to solve a circular dependency issue.
         *
         * @param {Namespace} globalNamespace
         */
        setGlobalNamespace: function (globalNamespace) {
            this.globalNamespace = globalNamespace;
        }
    });

    return ClassAutoloader;
}, {strict: true});
