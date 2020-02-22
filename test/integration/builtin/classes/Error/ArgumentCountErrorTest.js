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
    tools = require('../../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP builtin ArgumentCountError class integration', function () {
    var doRun,
        outputLog;

    beforeEach(function () {
        outputLog = [];
        doRun = function (engine) {
            // Capture the standard streams, prefixing each write with its name
            // so that we can ensure that what is written to each of them is in the correct order
            // with respect to one another
            engine.getStdout().on('data', function (data) {
                outputLog.push('[stdout]' + data);
            });
            engine.getStderr().on('data', function (data) {
                outputLog.push('[stderr]' + data);
            });

            return engine.execute();
        };
    });

    it('should raise the correct error when an optional argument is before a missing required one', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

function myFunction($firstArg, $secondArg = 21, $thirdArg) {}

myFunction(123);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            doRun(engine);
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: Too few arguments to function myFunction(),' +
            ' 1 passed in /path/to/module.php on line 7 and exactly 3 expected in /path/to/module.php on line 5'
        );
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught ArgumentCountError: Too few arguments to function myFunction(), 1 passed in /path/to/module.php on line 7 and exactly 3 expected in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(7): myFunction(123)
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught ArgumentCountError: Too few arguments to function myFunction(), 1 passed in /path/to/module.php on line 7 and exactly 3 expected in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(7): myFunction(123)
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
        ]);
    });
});
