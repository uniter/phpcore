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
    nowdoc = require('nowdoc'),
    phpCommon = require('phpcommon'),
    tools = require('../../../../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP builtin FFI function non-coercion by-reference parameter integration', function () {
    it('should raise a fatal error when custom function is passed primitive value in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

try_to_add_one(21); // Pass an immediate integer rather than a reference.

EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('try_to_add_one', function () {}, 'int &$myParam : int');

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Only variables can be passed by reference ' +
            'in /path/to/my_module.php on line 3'
        );
    });
});
