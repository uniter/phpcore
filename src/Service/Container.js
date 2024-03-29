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
 * Service container for the PHP runtime.
 *
 * @param {Object=} services
 * @constructor
 */
function Container(services) {
    /**
     * @type {Function}
     */
    this.serviceFetcher = this.getService.bind(this);
    /**
     * @type {string[]}
     */
    this.serviceIdsLoadingList = [];
    /**
     * @type {Object.<string, boolean>}
     */
    this.serviceIdsLoadingMap = {};
    /**
     * @type {Object.<string, Function>}
     */
    this.serviceProviders = {};
    /**
     * @type {Object.<string, *>}
     */
    this.services = _.extend({}, services);
}

_.extend(Container.prototype, {
    /**
     * Defines a new service provider.
     *
     * @param {string} id
     * @param {Function} provider
     * @param {boolean} allowOverride
     */
    defineService: function (id, provider, allowOverride) {
        var container = this;

        if (!allowOverride && hasOwn.call(container.serviceProviders, id)) {
            throw new Exception('Service with ID "' + id + '" is already defined');
        }

        // Note that even when overrides are allowed, an instantiated service may not be later overridden.
        if (hasOwn.call(container.services, id)) {
            throw new Exception('Service with ID "' + id + '" has already been instantiated');
        }

        container.serviceProviders[id] = provider;
    },

    /**
     * Fetches a defined service with the given ID.
     *
     * @param {id} id
     * @returns {Object}
     */
    getService: function (id) {
        var container = this,
            message,
            providerResult,
            setCalled = false;

        if (hasOwn.call(container.services, id)) {
            // Service has already been instantiated, just return it.
            return container.services[id];
        }

        if (!hasOwn.call(container.serviceProviders, id)) {
            message = 'No service with ID "' + id + '" is defined';

            if (container.serviceIdsLoadingList.length > 0) {
                message += ', chain was: "' + container.serviceIdsLoadingList.concat([id]).join('" -> "') + '"';
            }

            throw new Exception(message);
        }

        if (hasOwn.call(container.serviceIdsLoadingMap, id)) {
            throw new Exception(
                'Circular service dependency detected while fetching id "' + id +
                '", chain was: "' +
                container.serviceIdsLoadingList.concat([id]).join('" -> "') + '"'
            );
        }

        container.serviceIdsLoadingList.push(id);

        // Use a map as well as a lookup map to avoid slow .indexOf() checks
        // when testing for circular dependencies above.
        container.serviceIdsLoadingMap[id] = true;

        function setService(service) {
            container.services[id] = service;

            delete container.serviceIdsLoadingMap[id];
        }

        /**
         * Sets this service before the provider returns, allowing any nested
         * service fetches to invoke providers that in turn depend on this service.
         *
         * This allows circular dependencies to be set up via method injection, for example.
         *
         * @param {*} service
         * @returns {*}
         */
        function setCallback(service) {
            if (setCalled) {
                throw new Exception(
                    'Service "' + id + '" provider called set() multiple times'
                );
            }

            setCalled = true;

            if (!hasOwn.call(container.serviceIdsLoadingMap, id)) {
                throw new Exception(
                    'Service "' + id + '" provider already returned a value, but set() was later called'
                );
            }

            setService(service);

            // Return the assigned service to simplify logic in providers.
            return service;
        }

        /**
         * Perform the actual loading of the service via its defined provider.
         * Note that the service may either be returned or passed to the set() callback.
         */
        providerResult = container.serviceProviders[id](setCallback, container.serviceFetcher);

        if (setCalled) {
            if (typeof providerResult !== 'undefined') {
                throw new Exception(
                    'Service "' + id + '" provider returned a value after calling set()'
                );
            }
        } else {
            setService(providerResult);
        }

        if (container.serviceIdsLoadingList[container.serviceIdsLoadingList.length - 1] !== id) {
            throw new Exception(
                'Unexpected service ID list after loading "' + id + '"'
            );
        }

        container.serviceIdsLoadingList.pop();

        return container.services[id];
    },

    /**
     * Fetches a function to use for fetching services.
     * Usually used for fetching dependencies while constructing a service.
     *
     * @returns {Function}
     */
    getServiceFetcher: function () {
        var container = this;

        return container.serviceFetcher;
    },

    /**
     * Fetches the existing providers for the given services, if they are defined.
     *
     * @param {string[]} serviceIds
     * @returns {Object.<string, Function>}
     */
    getServiceProviders: function (serviceIds) {
        var container = this,
            providers = {};

        _.each(serviceIds, function (serviceId) {
            if (hasOwn.call(container.serviceProviders, serviceId)) {
                providers[serviceId] = container.serviceProviders[serviceId];
            }
        });

        return providers;
    },

    /**
     * Determines whether the container either defines a service with the given ID but it is not yet instantiated,
     * or has had a service with the given ID directly set on it via .setService(...).
     *
     * @param {string} id
     * @returns {boolean}
     */
    hasService: function (id) {
        var container = this;

        return hasOwn.call(container.serviceProviders, id) || hasOwn.call(container.services, id);
    },

    /**
     * Sets a service (without a provider) on the container.
     *
     * @param {string} id
     * @param {Object} service
     */
    setService: function (id, service) {
        var container = this;

        if (hasOwn.call(container.services, id)) {
            throw new Exception('Service with ID "' + id + '" is already instantiated');
        }

        container.services[id] = service;
    }
});

module.exports = Container;
