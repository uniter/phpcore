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
    tools = require('../../tools');

describe('PHP builtin Exception class integration', function () {
    describe('getFile()', function () {
        it('should return the file path for an Exception instance when tracked', function () {
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
                    // Capture offsets of all nodes for line tracking
                    phpToAST: {captureAllOffsets: true},
                    // Record line numbers for statements/expressions
                    phpToJS: {lineNumbers: true}
                });

            expect(module({path: '/my/test/module.php'}).execute().getNative()).to.deep.equal([
                '/my/test/module.php', // From myFirstThrower
                '/my/test/module.php', // From mySecondThrower
                '/my/test/module.php'  // From the top-level scope exception
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
                module = tools.syncTranspile(null, php, {
                    // Capture offsets of all nodes for line tracking
                    phpToAST: {captureAllOffsets: true},
                    // Record line numbers for statements/expressions
                    phpToJS: {lineNumbers: true}
                });

            expect(module().execute().getNative()).to.deep.equal([
                4,  // From myFirstThrower
                10, // From mySecondThrower
                20  // From the top-level scope exception
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
                module = tools.syncTranspile(null, php, {
                    // Capture offsets of all nodes for line tracking
                    phpToAST: {captureAllOffsets: true},
                    // Record line numbers for statements/expressions
                    phpToJS: {lineNumbers: true}
                });

            expect(module().execute().getNative()).to.deep.equal([
                12, // From myFirstThrower
                18, // From mySecondThrower
                28  // From the top-level scope exception
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
                module = tools.syncTranspile(null, php, {
                    // Capture offsets of all nodes for line tracking
                    phpToAST: {captureAllOffsets: true},
                    // Record line numbers for statements/expressions
                    phpToJS: {lineNumbers: true}
                });

            expect(module({path: 'myModule.php'}).execute().getNative()).to.deep.equal([
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
});
