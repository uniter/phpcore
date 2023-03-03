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
describe('PHP builtin TypeError class integration', function () {
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

    describe('when the wrong type is given for a userland function argument', function () {
        it('should raise the correct error', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --.

function myFunction(string $myArg) {}

myFunction(['not a string']);
EOS
*/;}), //jshint ignore:line
                module = tools.asyncTranspile('/path/to/module.php', php),
                engine = module();

            await expect(doRun(engine)).to.eventually.be.rejectedWith(
                PHPFatalError,
                'PHP Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myArg) must be of type string, array given, ' +
                'called in /path/to/module.php on line 7 and defined in /path/to/module.php:5 in /path/to/module.php on line 5'
            );
            expect(outputLog).to.deep.equal([
                nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught TypeError: myFunction(): Argument #1 ($myArg) must be of type string, array given, called in /path/to/module.php on line 7 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(7): myFunction(Array)
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

                // NB: Stdout should have a leading newline written out just before the message.
                nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myArg) must be of type string, array given, called in /path/to/module.php on line 7 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(7): myFunction(Array)
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
            ]);
        });

        it('should create the TypeError correctly', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --.

function myFunction(string $myArg) {}

$result = [];

try {
    myFunction(['not a string']);
} catch (Throwable $throwable) {
    $result['message'] = $throwable->getMessage();
    $result['file'] = $throwable->getFile();
    $result['line'] = $throwable->getLine();
}

return $result;
EOS
*/;}), //jshint ignore:line
                module = tools.asyncTranspile('/path/to/module.php', php),
                engine = module();

            expect((await doRun(engine)).getNative()).to.deep.equal({
                'message': 'myFunction(): Argument #1 ($myArg) must be of type string, array given, called in /path/to/module.php on line 10',
                'file': '/path/to/module.php',
                'line': 5
            });
        });
    });

    describe('when the wrong type is given for a builtin function argument', function () {
        it('should raise the correct error', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --.

myFunction(['not a string']);
EOS
*/;}), //jshint ignore:line
                module = tools.asyncTranspile('/path/to/module.php', php),
                engine = module();
            engine.defineCoercingFunction('myFunction', function () {}, 'string $myArg');

            await expect(doRun(engine)).to.eventually.be.rejectedWith(
                PHPFatalError,
                'PHP Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myArg) must be of type string, array given in /path/to/module.php:5' +
                // NB: Extraneous context info here is added by PHPFatalError (PHPError),
                //     but not output to stdout/stderr.
                ' in /path/to/module.php on line 5'
            );
            // Note that unlike for ArgumentCountErrors, for TypeErrors relating to builtin functions,
            // the builtin function itself does _not_ have a frame in the stack trace.
            expect(outputLog).to.deep.equal([
                nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught TypeError: myFunction(): Argument #1 ($myArg) must be of type string, array given in /path/to/module.php:5
Stack trace:
#0 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

                // NB: Stdout should have a leading newline written out just before the message.
                nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myArg) must be of type string, array given in /path/to/module.php:5
Stack trace:
#0 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
            ]);
        });

        it('should create the TypeError correctly', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --.

$result = [];

try {
    myFunction(['not a string']);
} catch (Throwable $throwable) {
    $result['message'] = $throwable->getMessage();
    $result['file'] = $throwable->getFile();
    $result['line'] = $throwable->getLine();
}

return $result;
EOS
*/;}), //jshint ignore:line
                module = tools.asyncTranspile('/path/to/module.php', php),
                engine = module();
            engine.defineCoercingFunction('myFunction', function () {}, 'string $myArg');

            expect((await doRun(engine)).getNative()).to.deep.equal({
                'message': 'myFunction(): Argument #1 ($myArg) must be of type string, array given',
                'file': '/path/to/module.php',
                'line': 8
            });
        });
    });
});
