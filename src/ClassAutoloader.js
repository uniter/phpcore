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
     * @param {ValueFactory} valueFactory
     * @param {Flow} flow
     * @constructor
     */
    function ClassAutoloader(valueFactory, flow) {
        /**
         * @type {Flow}
         */
        this.flow = flow;
        this.globalNamespace = null;
        this.splStack = null;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(ClassAutoloader.prototype, {
        appendAutoloadCallable: function (autoloadCallable) {
            var autoloader = this,
                splStack = autoloader.splStack;

            if (!splStack) {
                splStack = [];
                autoloader.splStack = splStack;
            }

            splStack.push(autoloadCallable);
        },

        /**
         * Attempts to autoload the specified class
         *
         * @param {string} name
         * @returns {Future<void>|FutureValue|Present|null}
         */
        autoloadClass: function (name) {
            var autoloader = this,
                globalNamespace = autoloader.globalNamespace,
                magicAutoloadFunction,
                splStack = autoloader.splStack;

            if (splStack) {
                // autoloader.flow.eachAsyncLegacy(splStack)
                //     .do(function (autoloadCallable) {
                //         autoloadCallable.call([autoloader.valueFactory.createString(name)], globalNamespace)
                //             .getValue()
                //             .yield();
                //     })
                //     .next(function () {
                //         if (globalNamespace.hasClass(name)) {
                //             // Autoloader has defined the class: no need to call any further autoloaders
                //             return false;
                //         }
                //     })
                //     .go();
                //
                // return;

                return autoloader.flow.eachAsync(splStack, function (autoloadCallable) {
                    return autoloadCallable.call([autoloader.valueFactory.createString(name)], globalNamespace)
                        .getValue()
                        .next(function () {
                            if (globalNamespace.hasClass(name)) {
                                // Autoloader has defined the class: no need to call any further autoloaders
                                return false;
                            }
                        });
                });
            }

            magicAutoloadFunction = globalNamespace.getOwnFunction(MAGIC_AUTOLOAD_FUNCTION);

            if (magicAutoloadFunction) {
                return magicAutoloadFunction(autoloader.valueFactory.createString(name))
                    .getValue();
            }

            return null;
        },

        removeAutoloadCallable: function (autoloadCallable) {
            var found = false,
                splStack = this.splStack;

            if (!splStack) {
                // SPL stack has not been enabled: nothing to do
                return false;
            }

            _.each(splStack, function (existingAutoloadCallable, index) {
                // Callables may be different value types or different objects,
                // so compare using the *Value API
                if (existingAutoloadCallable.isEqualTo(autoloadCallable).getNative()) {
                    found = true;
                    splStack.splice(index, 1);
                    return false;
                }
            });

            return found;
        },

        setGlobalNamespace: function (globalNamespace) {
            this.globalNamespace = globalNamespace;
        }
    });

    return ClassAutoloader;
}, {strict: true});
