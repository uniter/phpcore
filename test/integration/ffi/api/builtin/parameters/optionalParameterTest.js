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
    tools = require('../../../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP builtin FFI optional parameter "=?" integration', function () {
    var doRun,
        outputLog;

    beforeEach(function () {
        outputLog = [];
        doRun = function (engine) {
            // Capture the standard streams, prefixing each write with its name
            // so that we can ensure that what is written to each of them is in the correct order
            // with respect to one another.
            engine.getStdout().on('data', function (data) {
                outputLog.push('[stdout]' + data);
            });
            engine.getStderr().on('data', function (data) {
                outputLog.push('[stderr]' + data);
            });

            return engine.execute();
        };
    });

    it('should allow passing arrays for optional function parameters typed as "array"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return get_count([4, 5, 6]);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction(
            'get_count',
            function (arrayValue) {
                return arrayValue.getLength();
            },
            'array $myArray = ?'
        );

        expect((await engine.execute()).getNative()).to.equal(3);
    });

    it('should allow passing null for nullable optional function parameters typed as "array"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['array of length 4'] = get_count(['a', 'b', 'c', 'd']);
$result['explicit null'] = get_count(null);
$result['omitted'] = get_count();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction(
            'get_count',
            function (arrayValue) {
                if (arrayValue.getUnderlyingType() === 'null') {
                    return -1;
                }

                if (arrayValue.getUnderlyingType() === 'missing') {
                    return -2;
                }

                return arrayValue.getLength();
            },
            '?array $myArray = ?'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'array of length 4': 4,
            'explicit null': -1,
            'omitted': -2
        });
    });

    it('should raise an error when passing null to a non-nullable optional parameter', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

return get_count(null);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        engine.defineNonCoercingFunction(
            'get_count',
            function (arrayValue) {
                return arrayValue.getLength();
            },
            'array $myArray = ?'
        );

        await expect(doRun(engine)).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: get_count(): Argument #1 ($myArray) must be of type array,' +
            ' null given in /path/to/module.php:5' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr
            ' in /path/to/module.php on line 5'
        );
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught TypeError: get_count(): Argument #1 ($myArray) must be of type array, null given in /path/to/module.php:5
Stack trace:
#0 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught TypeError: get_count(): Argument #1 ($myArray) must be of type array, null given in /path/to/module.php:5
Stack trace:
#0 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
        ]);
    });
});
