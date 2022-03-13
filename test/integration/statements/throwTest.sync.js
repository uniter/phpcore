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

describe('PHP "throw" statement integration (sync mode)', function () {
    it('should support throwing an Exception contained in a variable', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myException = new Exception('Bang!');

throw $myException;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Exception: Bang! in /path/to/my_module.php on line 3'
        );
    });

    it('should raise an Error if attempting to throw a non-object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myNonThrowable = 'I am not throwable';

throw $myNonThrowable;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Can only throw objects in /path/to/my_module.php on line 5'
        );
    });

    it('should raise an Error if attempting to throw a non-Throwable object', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyNonThrowableClass {}

$myNonThrowable = new MyNonThrowableClass;

throw $myNonThrowable;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot throw objects that do not implement Throwable in /path/to/my_module.php on line 7'
        );
    });
});
