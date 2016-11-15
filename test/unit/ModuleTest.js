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
    Module = require('../../src/Module');

describe('Module', function () {
    describe('getFilePath()', function () {
        it('should return the path to the file the module was defined in when specified', function () {
            expect(new Module('/path/to/my/module.php').getFilePath()).to.equal('/path/to/my/module.php');
        });

        it('should return null when no path is specified', function () {
            expect(new Module().getFilePath()).to.be.null;
        });
    });
});
