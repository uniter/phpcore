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
 * Creates an exported proxying object value for an FFIObjectValue based on its class' interface
 *
 * @param {ProxyClassRepository} proxyClassRepository
 * @param {string} mode Synchronicity mode
 * @constructor
 */
function ProxyFactory(proxyClassRepository, mode) {
    /**
     * @type {string}
     */
    this.mode = mode;
    /**
     * @type {ProxyClassRepository}
     */
    this.proxyClassRepository = proxyClassRepository;
}

_.extend(ProxyFactory.prototype, {
    /**
     * Creates an exported proxy object value for the object value that the wrapped reference points to
     *
     * @param {ObjectValue} objectValue
     * @param {boolean=} useSyncApiAlthoughPsync
     * @returns {Object|*}
     */
    create: function (objectValue, useSyncApiAlthoughPsync) {
        var factory = this,
            ProxyClass = factory.proxyClassRepository.getProxyClass(objectValue.getClass());

        if (useSyncApiAlthoughPsync && factory.mode !== 'psync') {
            throw new Error('Cannot explicitly request sync API when not in psync mode');
        }

        return new ProxyClass(objectValue, useSyncApiAlthoughPsync);
    }
});

module.exports = ProxyFactory;
