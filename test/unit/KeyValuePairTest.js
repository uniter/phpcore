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
    tools = require('./tools'),
    KeyValuePair = require('../../src/KeyValuePair');

describe('KeyValuePair', function () {
    var key,
        pair,
        state,
        value,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        valueFactory = state.getValueFactory();
        key = valueFactory.createString('my_key');
        value = valueFactory.createString('my value');

        pair = new KeyValuePair(key, value);
    });

    describe('asArrayElement()', function () {
        it('should return the pair unchanged when the value is present', function () {
            expect(pair.asArrayElement()).to.equal(pair);
        });

        it('should return a Future that resolves with a pair with the value resolved when needed', async function () {
            var result;
            value = valueFactory.createAsyncPresent('my string');
            pair = new KeyValuePair(key, value);

            result = await pair.asArrayElement().toPromise();

            expect(result).not.to.equal(pair);
            expect(result.getKey()).to.equal(key);
            expect(result.getValue().getNative()).to.equal('my string');
        });
    });

    describe('getKey()', function () {
        it('should return the value of the key of the pair', function () {
            expect(pair.getKey()).to.equal(key);
        });
    });

    describe('getValue()', function () {
        it('should return the value of the pair', function () {
            expect(pair.getValue()).to.equal(value);
        });
    });
});
