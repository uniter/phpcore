/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var expect = require('chai').expect,
    tools = require('../tools'),
    CacheInvalidator = require('../../../src/Garbage/CacheInvalidator'),
    NullCacheInvalidator = require('../../../src/Garbage/NullCacheInvalidator');

describe('PHP garbage collection options integration', function () {
    it('should use CacheInvalidator when garbage collection is enabled explicitly via options hash', async function () {
        var environment = tools.createAsyncEnvironment({
                'garbageCollection': true
            }),
            state = environment.getState();

        expect(state.getService('garbage.cache_invalidator')).to.be.an.instanceOf(CacheInvalidator);
    });

    it('should use NullCacheInvalidator when garbage collection is disabled explicitly via options hash', async function () {
        var environment = tools.createAsyncEnvironment({
                'garbageCollection': false
            }),
            state = environment.getState();

        expect(state.getService('garbage.cache_invalidator')).to.be.an.instanceOf(NullCacheInvalidator);
    });

    it('should use NullCacheInvalidator when garbage collection is disabled implicitly (by default)', async function () {
        var environment = tools.createAsyncEnvironment(),
            state = environment.getState();

        expect(state.getService('garbage.cache_invalidator')).to.be.an.instanceOf(NullCacheInvalidator);
    });
});
