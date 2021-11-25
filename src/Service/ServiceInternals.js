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
    hasOwn = {}.hasOwnProperty,
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception;

/**
 * Internals object provided to service provider group factories.
 *
 * @param {Container} container
 * @constructor
 */
function ServiceInternals(container) {
    /**
     * @type {Container}
     */
    this.container = container;
    /**
     * @type {Object.<string, Function>}
     */
    this.previousServiceProviders = {};
    /**
     * @type {boolean}
     */
    this.serviceOverrideAllowed = false;
}

_.extend(ServiceInternals.prototype, {
    /**
     * Allows services in this group to override previously defined ones.
     */
    allowServiceOverride: function () {
        this.serviceOverrideAllowed = true;
    },

    /**
     * Calls the previous provider for this service, if one was defined.
     *
     * @param {string} serviceId
     * @throws {Exception} Throws when service overriding has not been allowed for this group.
     */
    callPreviousProvider: function (serviceId) {
        var internals = this;

        if (!internals.hasPreviousProvider(serviceId)) {
            throw new Exception('Service "' + serviceId + '" has no previous provider');
        }

        return internals.previousServiceProviders[serviceId]();
    },

    /**
     * Fetches a function to use for fetching services.
     * Usually used for fetching dependencies while constructing a service.
     *
     * @returns {Function}
     */
    getServiceFetcher: function () {
        return this.container.getServiceFetcher();
    },

    /**
     * Determines whether the given service has a previous provider defined,
     * providing service overriding has been enabled.
     *
     * @param {string} serviceId
     * @returns {boolean}
     * @throws {Exception} Throws when service overriding has not been allowed for this group
     */
    hasPreviousProvider: function (serviceId) {
        var internals = this;

        if (!internals.serviceOverrideAllowed) {
            throw new Exception('Service overriding has not been allowed for the group');
        }

        return hasOwn.call(internals.previousServiceProviders, serviceId);
    },

    /**
     * Determines whether service overriding is allowed for this group.
     *
     * @returns {boolean}
     */
    isServiceOverrideAllowed: function () {
        return this.serviceOverrideAllowed;
    },

    /**
     * Sets the previous providers for the services defined for this group,
     * when service overriding has been enabled.
     *
     * @param {Object.<string, Function>} previousServiceProviders
     */
    setPreviousServiceProviders: function (previousServiceProviders) {
        this.previousServiceProviders = previousServiceProviders;
    }
});

module.exports = ServiceInternals;
