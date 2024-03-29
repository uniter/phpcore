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
    tools = require('../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP builtin Error class integration', function () {
    it('should correctly export a PHP Error instance to JS-land', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return new Error('Oh dear');
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            resultNativeError,
            resultValue;

        resultValue = await engine.execute();

        expect(resultValue.getType()).to.equal('object');
        expect(resultValue.getInternalValue().getClassName()).to.equal('Error');
        resultNativeError = resultValue.getNative();
        // Note that this coercion is defined by a custom unwrapper in src/builtin/interfaces/Throwable.js.
        expect(resultNativeError).to.be.an.instanceOf(PHPFatalError);
        expect(resultNativeError.getFilePath()).to.equal('/path/to/my_module.php');
        expect(resultNativeError.getLevel()).to.equal('Fatal error');
        expect(resultNativeError.getLineNumber()).to.equal(3);
        expect(resultNativeError.getMessage()).to.equal('Uncaught Error: Oh dear');
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    describe('getFile()', function () {
        it('should return the file path for an Error instance when known', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower() {
    $error = new Error('Bang one');

    return $error->getFile();
}

function mySecondThrower() {
    $error = new Error('Bang two');

    return $error->getFile();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$error = new Error('Bang three');
$result[] = $error->getFile();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/my/test/module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                '/my/test/module.php', // From myFirstThrower.
                '/my/test/module.php', // From mySecondThrower.
                '/my/test/module.php'  // From the top-level scope error.
            ]);
        });

        it('should return null as the file path for an Error instance when not known', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower() {
    $error = new Error('Bang one');

    return $error->getFile();
}

function mySecondThrower() {
    $error = new Error('Bang two');

    return $error->getFile();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$error = new Error('Bang three');
$result[] = $error->getFile();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile(null, php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                null, // From myFirstThrower.
                null, // From mySecondThrower.
                null  // From the top-level scope error.
            ]);
        });

        it('should return any custom value set for the protected ->file property', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyError extends Error
{
    public function __construct()
    {
        $this->file = '/my/custom/file/path';
    }
}

$result = [];

$myError = new MyError();
$result[] = $myError->getFile();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/my/test/module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                '/my/custom/file/path'
            ]);
        });
    });

    describe('getLine()', function () {
        it('should return the original PHP line number for an Error instance when tracked', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower() {
    $error = new Error('Bang one');

    return $error->getLine();
}

function mySecondThrower() {
    $error = new Error('Bang two');

    return $error->getLine();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$error = new Error('Bang three');
$result[] = $error->getLine();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                4,  // From myFirstThrower.
                10, // From mySecondThrower.
                20  // From the top-level scope error.
            ]);
        });

        it('should return null for the PHP line number for an Error instance when not tracked', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower() {
    $error = new Error('Bang one');

    return $error->getLine();
}

function mySecondThrower() {
    $error = new Error('Bang two');

    return $error->getLine();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$error = new Error('Bang three');
$result[] = $error->getLine();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php, {
                    // Turn off line tracking.
                    phpToAST: {captureAllBounds: false},
                    phpToJS: {lineNumbers: false}
                }),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                null, // From myFirstThrower.
                null, // From mySecondThrower.
                null  // From the top-level scope error.
            ]);
        });

        it('should return the original PHP line number for an Error-derived instance when tracked', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyCustomError extends Error
{
    public function __construct()
    {
        // Deliberately do not call the parent constructor, to check our internal native shadow one is still used.
    }
}

function myFirstThrower() {
    $error = new MyCustomError('My first custom error');

    return $error->getLine();
}

function mySecondThrower() {
    $error = new MyCustomError('My second custom error');

    return $error->getLine();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$error = new Error('Bang three');
$result[] = $error->getLine();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                12, // From myFirstThrower.
                18, // From mySecondThrower.
                28  // From the top-level scope error.
            ]);
        });

        it('should return any custom value set for the protected ->line property', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyError extends Error
{
    public function __construct()
    {
        $this->line = 4127;
    }
}

$result = [];

$myError = new MyError();
$result[] = $myError->getLine();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/my/test/module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                4127
            ]);
        });
    });

    describe('getMessage()', function () {
        it('should return the message for the Error', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class CustomError extends Error
{
    public function __construct($message)
    {
        parent::__construct('[Custom] ' . $message);
    }
}

$result = [];

$result[] = (new Error('First bang'))->getMessage();
$result[] = (new CustomError('Second bang'))->getMessage();
$result[] = (new Error())->getMessage(); // No message specified - should default to the empty string.

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/path/to/my_module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                'First bang',
                '[Custom] Second bang',
                ''
            ]);
        });

        it('should return any custom value set for the protected ->message property', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyError extends Error
{
    public function __construct()
    {
        $this->message = 'My custom message';
    }
}

$result = [];

$myError = new MyError();
$result[] = $myError->getMessage();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/my/test/module.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                'My custom message'
            ]);
        });
    });

    describe('getTraceAsString()', function () {
        it('should return the correct file paths and line numbers for an Error instance when tracked', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower($arg1, $arg2) { // With some other implicit parameters.
    $error = new Error('Bang one');

    return $error->getTraceAsString();
}

function mySecondThrower() {
    $error = new Error('Bang two');

    return $error->getTraceAsString();
}

function proxyOne()
{
    return myFirstThrower(['thing' => 102], true, 21.2, 27, null, new \stdClass, 'my arg');
}

function proxyTwo()
{
    return mySecondThrower();
}

$result = [];

$result[] = proxyOne();
$result[] = proxyTwo();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('myModule.php', php),
                engine = module();

            expect((await engine.execute()).getNative()).to.deep.equal([
                // From myFirstThrower.
                nowdoc(function () {/*<<<EOS
#0 myModule.php(17): myFirstThrower(Array, true, 21.2, 27, NULL, Object(stdClass), 'my arg')
#1 myModule.php(27): proxyOne()
#2 {main}
EOS
*/;}), //jshint ignore:line
                // From mySecondThrower.
                nowdoc(function () {/*<<<EOS
#0 myModule.php(22): mySecondThrower()
#1 myModule.php(28): proxyTwo()
#2 {main}
EOS
*/;}) //jshint ignore:line
            ]);
        });
    });

    describe('when thrown but not caught', function () {
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

        it('should output the correct message for an empty Error', async function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers --.

throw new Error;
EOS
*/;}),//jshint ignore:line
                module = tools.asyncTranspile('/my/php_module.php', php),
                engine = module();

            await expect(doRun(engine)).to.eventually.be.rejectedWith(
                PHPFatalError,
                'PHP Fatal error: Uncaught Error in /my/php_module.php on line 5'
            );
            expect(outputLog).to.deep.equal([
                nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught Error in /my/php_module.php:5
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 5

EOS
*/;}), //jshint ignore:line

                // NB: Stdout should have a leading newline written out just before the message.
                nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught Error in /my/php_module.php:5
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 5

EOS
*/;}) //jshint ignore:line
            ]);
        });
    });
});
