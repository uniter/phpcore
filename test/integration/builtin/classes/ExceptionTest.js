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

describe('PHP builtin Exception class integration', function () {
    describe('getFile()', function () {
        it('should return the file path for an Exception instance when known', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower() {
    $exception = new Exception('Bang one');

    return $exception->getFile();
}

function mySecondThrower() {
    $exception = new Exception('Bang two');

    return $exception->getFile();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$exception = new Exception('Bang three');
$result[] = $exception->getFile();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile('/my/test/module.php', php);

            expect(module().execute().getNative()).to.deep.equal([
                '/my/test/module.php', // From myFirstThrower
                '/my/test/module.php', // From mySecondThrower
                '/my/test/module.php'  // From the top-level scope exception
            ]);
        });

        it('should return null as the file path for an Exception instance when not known', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower() {
    $exception = new Exception('Bang one');

    return $exception->getFile();
}

function mySecondThrower() {
    $exception = new Exception('Bang two');

    return $exception->getFile();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$exception = new Exception('Bang three');
$result[] = $exception->getFile();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php, {
                    // Turn off line tracking
                    phpToAST: {captureAllBounds: false},
                    phpToJS: {lineNumbers: false}
                });

            expect(module().execute().getNative()).to.deep.equal([
                null, // From myFirstThrower
                null, // From mySecondThrower
                null  // From the top-level scope exception
            ]);
        });

        it('should return any custom value set for the protected ->file property', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception
{
    public function __construct()
    {
        $this->file = '/my/custom/file/path';
    }
}

$result = [];

$myException = new MyException();
$result[] = $myException->getFile();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile('/my/test/module.php', php);

            expect(module().execute().getNative()).to.deep.equal([
                '/my/custom/file/path'
            ]);
        });
    });

    describe('getLine()', function () {
        it('should return the original PHP line number for an Exception instance when tracked', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower() {
    $exception = new Exception('Bang one');

    return $exception->getLine();
}

function mySecondThrower() {
    $exception = new Exception('Bang two');

    return $exception->getLine();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$exception = new Exception('Bang three');
$result[] = $exception->getLine();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);

            expect(module().execute().getNative()).to.deep.equal([
                4,  // From myFirstThrower
                10, // From mySecondThrower
                20  // From the top-level scope exception
            ]);
        });

        it('should return null for the PHP line number for an Exception instance when not tracked', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower() {
    $exception = new Exception('Bang one');

    return $exception->getLine();
}

function mySecondThrower() {
    $exception = new Exception('Bang two');

    return $exception->getLine();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$exception = new Exception('Bang three');
$result[] = $exception->getLine();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php, {
                    // Turn off line tracking
                    phpToAST: {captureAllBounds: false},
                    phpToJS: {lineNumbers: false}
                });

            expect(module().execute().getNative()).to.deep.equal([
                null, // From myFirstThrower
                null, // From mySecondThrower
                null  // From the top-level scope exception
            ]);
        });

        it('should return the original PHP line number for an Exception-derived instance when tracked', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyCustomException extends Exception
{
    public function __construct()
    {
        // Deliberately do not call the parent constructor, to check our internal native shadow one is still used
    }
}

function myFirstThrower() {
    $exception = new MyCustomException('My first custom exception');

    return $exception->getLine();
}

function mySecondThrower() {
    $exception = new MyCustomException('My second custom exception');

    return $exception->getLine();
}

$result = [];

$result[] = myFirstThrower();
$result[] = mySecondThrower();

$exception = new Exception('Bang three');
$result[] = $exception->getLine();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);

            expect(module().execute().getNative()).to.deep.equal([
                12, // From myFirstThrower
                18, // From mySecondThrower
                28  // From the top-level scope exception
            ]);
        });

        it('should return any custom value set for the protected ->line property', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception
{
    public function __construct()
    {
        $this->line = 4127;
    }
}

$result = [];

$myException = new MyException();
$result[] = $myException->getLine();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile('/my/test/module.php', php);

            expect(module().execute().getNative()).to.deep.equal([
                4127
            ]);
        });
    });

    describe('getMessage()', function () {
        it('should return the message for the Exception', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class CustomException extends Exception
{
    public function __construct($message)
    {
        parent::__construct('[Custom] ' . $message);
    }
}

$result = [];

$result[] = (new Exception('First bang'))->getMessage();
$result[] = (new CustomException('Second bang'))->getMessage();
$result[] = (new Exception())->getMessage(); // No message specified - should default to the empty string

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile(null, php);

            expect(module().execute().getNative()).to.deep.equal([
                'First bang',
                '[Custom] Second bang',
                ''
            ]);
        });

        it('should return any custom value set for the protected ->message property', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception
{
    public function __construct()
    {
        $this->message = 'My custom message';
    }
}

$result = [];

$myException = new MyException();
$result[] = $myException->getMessage();

return $result;

EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile('/my/test/module.php', php);

            expect(module().execute().getNative()).to.deep.equal([
                'My custom message'
            ]);
        });
    });

    describe('getTraceAsString()', function () {
        it('should return the correct file paths and line numbers for an Exception instance when tracked', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

function myFirstThrower($arg1, $arg2) { // With some other implicit parameters
    $exception = new Exception('Bang one');

    return $exception->getTraceAsString();
}

function mySecondThrower() {
    $exception = new Exception('Bang two');

    return $exception->getTraceAsString();
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
                module = tools.syncTranspile('myModule.php', php);

            expect(module().execute().getNative()).to.deep.equal([
                // From myFirstThrower
                nowdoc(function () {/*<<<EOS
#0 myModule.php(17): myFirstThrower(Array, true, 21.2, 27, NULL, Object(stdClass), 'my arg')
#1 myModule.php(27): proxyOne()
#2 {main}
EOS
*/;}), //jshint ignore:line
                // From mySecondThrower
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

        it('should output the correct message for an empty Exception', function () {
            var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers --

throw new Exception;
EOS
*/;}),//jshint ignore:line
                module = tools.syncTranspile('/my/php_module.php', php),
                engine = module();

            expect(function () {
                doRun(engine);
            }).to.throw(
                PHPFatalError,
                'PHP Fatal error: Uncaught Exception in /my/php_module.php on line 5'
            );
            expect(outputLog).to.deep.equal([
                nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught Exception in /my/php_module.php:5
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 5

EOS
*/;}), //jshint ignore:line

                // NB: Stdout should have a leading newline written out just before the message
                nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught Exception in /my/php_module.php:5
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 5

EOS
*/;}) //jshint ignore:line
            ]);
        });
    });
});
