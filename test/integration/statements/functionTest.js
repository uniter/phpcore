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
    tools = require('../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP "function" statement integration', function () {
    it('should return the expected result for a simple return statement', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function doNothing() {}

return doNothing();
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(null);
    });

    it('should raise a fatal error when attempting to redefine a built-in function in userland', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function spl_autoload_register() {}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Cannot redeclare spl_autoload_register() in /path/to/my_module.php on line 3'
        );
    });

    it('should raise a fatal error when attempting to redefine a userland function with same case', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function my_func() {}

function my_func() {}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            // Note that unlike built-ins, for userland functions
            // we can provide the previous declaration's context.
            'PHP Fatal error: Cannot redeclare my_func() (previously declared in /path/to/my_module.php:3) in /path/to/my_module.php on line 5'
        );
    });

    it('should raise a fatal error when attempting to redefine a userland function with different case', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function my_func() {}

function my_FUnc() {}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            // Note that unlike built-ins, for userland functions
            // we can provide the previous declaration's context.
            'PHP Fatal error: Cannot redeclare my_FUnc() (previously declared in /path/to/my_module.php:3) in /path/to/my_module.php on line 5'
        );
    });
});
