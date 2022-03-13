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
    tools = require('../tools');

describe('Async control Future integration', function () {
    var environment,
        futureFactory,
        state;

    beforeEach(function () {
        environment = tools.createAsyncEnvironment();
        state = environment.getState();
        futureFactory = state.getFutureFactory();
    });

    describe('concatString()', function () {
        it('should be able to concatenate a string asynchronously multiple times', async function () {
            var future = futureFactory.createAsyncPresent('first');

            future = future.concatString(' second');
            future = future.concatString(' third');

            expect(await future.toPromise()).to.equal('first second third');
        });
    });
});
