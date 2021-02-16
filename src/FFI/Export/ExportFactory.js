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
 * Fetches the exported value for an FFIObjectValue, creating and caching it if needed
 *
 * @param {UnwrapperRepository} unwrapperRepository
 * @param {ProxyFactory} proxyFactory
 * @constructor
 */
function ExportFactory(unwrapperRepository, proxyFactory) {
    /**
     * @type {ProxyFactory}
     */
    this.proxyFactory = proxyFactory;
    /**
     * @type {UnwrapperRepository}
     */
    this.unwrapperRepository = unwrapperRepository;
}

_.extend(ExportFactory.prototype, {
    /**
     * Creates an exported value for the object value that the wrapped reference points to.
     * If a custom unwrapper has been defined for its class then that will be used instead.
     *
     * @param {ObjectValue} objectValue
     * @returns {Object|*}
     */
    create: function (objectValue) {
        var classObject = objectValue.getClass(),
            coercedObject,
            factory = this,
            unwrapper = factory.unwrapperRepository.getUnwrapperForClass(classObject);

        if (unwrapper !== null) {
            // A custom unwrapper has been defined for the class of this object

            // In auto-coercing mode, provide the native object, otherwise the object value
            coercedObject = objectValue.getThisObject();

            // Provide the object as both the thisObj and the first argument for ease of use
            return unwrapper.call(coercedObject, coercedObject);
        }

        // No custom unwrapper has been defined, use a generated ProxyClass
        return factory.proxyFactory.create(objectValue);
    }
});

module.exports = ExportFactory;
