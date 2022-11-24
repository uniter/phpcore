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

describe('PHP "throw" statement integration (async mode)', function () {
    it('should support throwing an Exception contained in a variable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myException = new Exception('Bang!');

throw $myException;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Exception: Bang! in /path/to/my_module.php on line 3'
        );
    });

    it('should support throwing an Exception fetched directly from accessor returning future', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// Write the exception to the accessor.
$myThrowableAccessor = new Exception('Bang!');

// Read the exception back from the accessor and throw.
throw $myThrowableAccessor;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            throwableValue;
        engine.defineGlobalAccessor(
            'myThrowableAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(throwableValue);
                    });
                });
            },
            function (newThrowableValue) {
                throwableValue = newThrowableValue;
            }
        );

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Exception: Bang! in /path/to/my_module.php on line 4'
        );
    });
});
