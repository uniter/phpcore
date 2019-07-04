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
 * Contains a set of hooks to be called when various operations are performed on a hookable array's elements
 *
 * @constructor
 */
function ElementHookCollection() {
    /**
     * @type {Function[]}
     */
    this.onElementReferenceSetCallbacks = [];
    /**
     * @type {Function[]}
     */
    this.onElementValueSetCallbacks = [];
    /**
     * @type {Function[]}
     */
    this.onElementUnsetCallbacks = [];
}

_.extend(ElementHookCollection.prototype, {
    /**
     * Handles the setting of a hookable element's reference by invoking all relevant callbacks
     *
     * @param {HookableElement} element
     * @param {Reference} referenceSet
     */
    handleElementReferenceSet: function (element, referenceSet) {
        _.each(this.onElementReferenceSetCallbacks, function (callback) {
            callback(element, referenceSet);
        });
    },

    /**
     * Handles the setting of a hookable element's value by invoking all relevant callbacks
     *
     * @param {HookableElement} element
     * @param {Value} valueSet
     */
    handleElementValueSet: function (element, valueSet) {
        _.each(this.onElementValueSetCallbacks, function (callback) {
            callback(element, valueSet);
        });
    },

    /**
     * Handles the unsetting of a hookable element by invoking all relevant callbacks
     *
     * @param {HookableElement} element
     */
    handleElementUnset: function (element) {
        _.each(this.onElementUnsetCallbacks, function (callback) {
            callback(element);
        });
    },

    /**
     * Installs a new hook callback to be called when a hookable element's reference is set
     *
     * @param {Function} callback
     */
    onElementReferenceSet: function (callback) {
        this.onElementReferenceSetCallbacks.push(callback);
    },

    /**
     * Installs a new hook callback to be called when a hookable element's value is set
     *
     * @param {Function} callback
     */
    onElementValueSet: function (callback) {
        this.onElementValueSetCallbacks.push(callback);
    },

    /**
     * Installs a new hook callback to be called when a hookable element is unset
     *
     * @param {Function} callback
     */
    onElementUnset: function (callback) {
        this.onElementUnsetCallbacks.push(callback);
    }
});

module.exports = ElementHookCollection;
