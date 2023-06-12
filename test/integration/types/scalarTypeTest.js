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

describe('PHP scalar type integration', function () {
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

    it('should allow passing booleans for function parameters typed as "bool"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myChecker(bool $myBool) {
    return $myBool ? 'yes' : 'no';
}

$result['true'] = myChecker(true);
$result['false'] = myChecker(false);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'true': 'yes',
            'false': 'no'
        });
    });

    it('should allow passing floats for function parameters typed as "float"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myDoubler(float $myNumber) {
    return $myNumber * 2;
}

$result['zero'] = myDoubler(0);
$result['positive float'] = myDoubler(21.23);
$result['negative float'] = myDoubler(-101.34);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'zero': 0,
            'positive float': 42.46,
            'negative float': -202.68
        });
    });

    it('should allow passing integers for function parameters typed as "int"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myDoubler(int $myNumber) {
    return $myNumber * 2;
}

$result['zero'] = myDoubler(0);
$result['positive integer'] = myDoubler(21);
$result['negative integer'] = myDoubler(-101);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'zero': 0,
            'positive integer': 42,
            'negative integer': -202
        });
    });

    it('should allow passing strings for function parameters typed as "string"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myProcessor(string $myText) {
    return '"' . $myText . '" is my text';
}

$result['empty string'] = myProcessor('');
$result['hello world'] = myProcessor('hello world');

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'empty string': '"" is my text',
            'hello world': '"hello world" is my text',
        });
    });

    it('should allow passing null for function parameters typed as "int" with default null', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myDoubler(int $myNumber = null) {
    return ($myNumber ?? 100) * 2;
}

// Omit the $myNumber argument.
$result['omitted'] = myDoubler();
$result['explicit null'] = myDoubler(null);
$result['zero'] = myDoubler(0);
$result['positive integer'] = myDoubler(21);
$result['negative integer'] = myDoubler(-101);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'omitted': 200,
            'explicit null': 200,
            'zero': 0,
            'positive integer': 42,
            'negative integer': -202
        });
    });

    it('should raise a fatal error when an integer parameter is given an array argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

function myDoubler(int $myNumber) {
    return $myNumber * 2;
}

myDoubler(['my' => 'array']); // Not an integer!
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(doRun(engine)).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: myDoubler(): Argument #1 ($myNumber) must be of type int,' +
            ' array given, called in /path/to/my_module.php on line 8 and defined in /path/to/my_module.php:4' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr.
            ' in /path/to/my_module.php on line 4'
        );
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught TypeError: myDoubler(): Argument #1 ($myNumber) must be of type int, array given, called in /path/to/my_module.php on line 8 and defined in /path/to/my_module.php:4
Stack trace:
#0 /path/to/my_module.php(8): myDoubler(Array)
#1 {main}
  thrown in /path/to/my_module.php on line 4

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught TypeError: myDoubler(): Argument #1 ($myNumber) must be of type int, array given, called in /path/to/my_module.php on line 8 and defined in /path/to/my_module.php:4
Stack trace:
#0 /path/to/my_module.php(8): myDoubler(Array)
#1 {main}
  thrown in /path/to/my_module.php on line 4

EOS
*/;}) //jshint ignore:line
        ]);
    });
});
