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
 * Fetches the generated JS proxy class for a PHP class, creating and caching it if needed
 *
 * @param {ProxyClassFactory} proxyClassFactory
 * @constructor
 */
function ProxyClassRepository(proxyClassFactory) {
    /**
     * @type {WeakMap<object, Function>}
     */
    this.classToProxyClassMap = new WeakMap();
    /**
     * @type {ProxyClassFactory}
     */
    this.proxyClassFactory = proxyClassFactory;
}

_.extend(ProxyClassRepository.prototype, {
    /**
     * Fetches the proxy class for the given PHP class
     *
     * @param {Class} classObject
     * @returns {class}
     */
    getProxyClass: function (classObject) {
        var ProxyClass,
            repository = this;

        if (repository.classToProxyClassMap.has(classObject)) {
            // Cache the ProxyClass for each PHP class for identity and to save on memory
            return repository.classToProxyClassMap.get(classObject);
        }

        ProxyClass = repository.proxyClassFactory.create(classObject);

        repository.classToProxyClassMap.set(classObject, ProxyClass);

        return ProxyClass;
    }
});

module.exports = ProxyClassRepository;
