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
    Set = require('core-js-pure/actual/set');

/**
 * Keeps a strong reference to all known destructible objects (implementing ->__destruct())
 * so that we can call their destructor upon destruction.
 *
 * @constructor
 */
function DestructibleObjectRepository() {
    /**
     * @type {Set<ObjectValue>}
     */
    this.objectValues = new Set();
}

_.extend(DestructibleObjectRepository.prototype, {
    /**
     * Fetches all known destructible ObjectValues that have not yet been garbage collected.
     *
     * @returns {ObjectValue[]}
     */
    getObjectValues: function () {
        // TODO: Look into how we can avoid needing this Array.from(...).
        return Array.from(this.objectValues);
    },

    /**
     * Registers a destructible ObjectValue.
     *
     * @param {ObjectValue} value
     */
    registerValue: function (value) {
        this.objectValues.add(value);
    },

    /**
     * Unregisters a destructible ObjectValue once it has been destructed.
     *
     * @param {ObjectValue} value
     */
    unregisterValue: function (value) {
        this.objectValues.delete(value);
    }
});

module.exports = DestructibleObjectRepository;
