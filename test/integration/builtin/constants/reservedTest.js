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
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    syncPhpCore = require('../../../../sync');

describe('PHP builtin reserved constant integration', function () {
    it('should support PHP_EOL', function () {
        var php = '<?php return PHP_EOL;',
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return syncPhpCore;
            });

        expect(module().execute().getNative()).to.equal('\n');
    });
});
