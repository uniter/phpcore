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
 * @param {Object.<string, OpcodeFetcherInterface>} nameToFetcherMap
 * @constructor
 */
function OpcodeFetcherRepository(nameToFetcherMap) {
    /**
     * @type {Object<string, OpcodeFetcherInterface>}
     */
    this.nameToFetcherMap = nameToFetcherMap;
}

_.extend(OpcodeFetcherRepository.prototype, {
    /**
     * Fetches an opcode fetcher by its unique name
     *
     * @param {string} type
     * @returns {OpcodeFetcherInterface}
     */
    getFetcher: function (type) {
        var repository = this;

        if (!hasOwn.call(repository.nameToFetcherMap, type)) {
            throw new Exception('Unregistered opcode fetcher type "' + type + '"');
        }

        return repository.nameToFetcherMap[type];
    }
});

module.exports = OpcodeFetcherRepository;
