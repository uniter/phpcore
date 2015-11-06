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
    pausable = require('pausable'),
    phpCore = require('../../async'),
    Runtime = require('../../src/Runtime').async(pausable);

describe('Public asynchronous API', function () {
    it('should export an instance of Runtime', function () {
        expect(phpCore).to.be.an.instanceOf(Runtime);
    });
});
