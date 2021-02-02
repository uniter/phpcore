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
    WeakMap = require('es6-weak-map');

/**
 * Stores custom unwrappers for classes. When later fetched, if a class does not define
 * an unwrapper on itself, its ancestry will be checked to see if any ancestor does,
 * in which case that unwrapper will be used.
 *
 * @constructor
 */
function UnwrapperRepository() {
    /**
     * @type {WeakMap<object, Function>}
     */
    this.classToUnwrapperMap = new WeakMap();
}

_.extend(UnwrapperRepository.prototype, {
    /**
     * Defines a custom unwrapper for a class
     *
     * @param {Class} classObject
     * @param {Function} unwrapper
     */
    defineUnwrapper: function (classObject, unwrapper) {
        this.classToUnwrapperMap.set(classObject, unwrapper);
    },

    /**
     * Fetches the custom unwrapper for the class or an ancestor if defined
     *
     * @param {Class} classObject
     * @returns {Function|null}
     */
    getUnwrapperForClass: function (classObject) {
        var currentClass = classObject,
            repository = this,
            unwrapper = null;

        while (currentClass !== null) {
            if (repository.classToUnwrapperMap.has(currentClass)) {
                // A custom unwrapper has been defined for the class
                return repository.classToUnwrapperMap.get(currentClass);
            }

            // Now check whether any interfaces implemented directly by the class define an unwrapper
            /*jshint loopfunc: true */
            if (currentClass.getInterfaces().some(function (interfaceObject) {
                unwrapper = repository.getUnwrapperForClass(interfaceObject);

                if (unwrapper !== null) {
                    // A custom unwrapper has been defined for the interface (or somewhere in its ancestry)

                    return true; // No need to keep checking
                }
            })) {
                return unwrapper;
            }

            currentClass = currentClass.getSuperClass();
        }

        // No custom unwrapper has been defined
        return null;
    }
});

module.exports = UnwrapperRepository;
