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
    tools = require('../tools'),
    PHPFatalError = require('phpcommon').PHPFatalError;

describe('PHP synchronous function call integration', function () {
    it('should treat function names as case-insensitive', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace {
    function myFunc() {
        return 22;
    }
}

namespace My\App {
    function anotherFunc() {
        return 23;
    }
}

namespace {
    use MY\APP as myapp; // Alias and ref'd class path should be case-insensitive too

    return [
        myfUNC(),
        myApP\ANOTHERfunc()
    ];
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            22,
            23
        ]);
    });

    it('should allow by-ref parameters to have default values', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunc(&$myArg = 1000)
{
    $originalArg = $myArg;

    $myArg = $myArg * 2;

    return $originalArg;
}

$myVar = 21;

$result = [];
$result[] = myFunc($myVar);
$result[] = $myVar;
$result[] = myFunc();
$result[] = $myVar;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            42,
            1000,
            42
        ]);
    });

    it('should raise a fatal error if an integer is passed when a reference is expected', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction(&$myRef)
{
    $myRef = 21;
}

myFunction(21);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('your_module.php', php);

        expect(function () {
            module().execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Only variables can be passed by reference in your_module.php on line 7'
        );
    });

    it('should raise a fatal error if a user-defined function is called missing an argument (exact count)', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction($firstArg, $secondArg, $thirdArg)
{
    print 'I should not be reached';
}

include 'caller.php';
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('main_module.php', php),
            engine = module({
                // Perform the call from a separate script so that we can test
                // that the caller & callee file paths given in the error message are correct
                include: function (path, promise) {
                    if (path === 'caller.php') {
                        promise.resolve(tools.syncTranspile(path, '<?php\n\n\nmyFunction(21, 42);'));
                        return;
                    }

                    throw new Error('Unexpected include of "' + path + '"');
                }
            });

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: Too few arguments to function myFunction(), ' +
            '2 passed in caller.php on line 4 and exactly 3 expected in main_module.php on line 2'
        );
    });

    it('should allow a variable containing an array to be passed by-reference', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction(array &$theArray)
{
    $theArray[] = 'added';
}

$myArray = [21, 101];

myFunction($myArray);

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            101,
            'added'
        ]);
    });

    it('should support calling static and instance methods with arrays', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public static function myStaticMethod($start)
    {
        return $start + 4;
    }

    public function myInstanceMethod($start)
    {
        return $start * 2;
    }
}

$object = new MyClass;
$staticCallable = ['MyClass', 'myStaticMethod'];
$instanceCallable = [$object, 'myInstanceMethod'];

$result = [];
$result[] = $staticCallable(10);
$result[] = $instanceCallable(20);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            14, // 10 + 4
            40  // 20 * 2
        ]);
    });

    it('should allow a closure to be called where an argument is an array literal containing a named element with a variable as a value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$myVar = 101;
$myFunc = function (array $arg) use (&$result) {
    $result[] = 'Result: ' . $arg['named'];
};

$myFunc([21, 'named' => $myVar]);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            'Result: 101'
        ]);
    });

    it('should raise a fatal error if a closure is called missing an argument (exact count)', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myFunction = function ($firstArg, $secondArg, $thirdArg) {
    print 'I should not be reached';
};

include 'caller.php';
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('main_module.php', php),
            engine = module({
                // Perform the call from a separate script so that we can test
                // that the caller & callee file paths given in the error message are correct
                include: function (path, promise) {
                    if (path === 'caller.php') {
                        promise.resolve(tools.syncTranspile(path, '<?php\n\n$myFunction(21, 42);'));
                        return;
                    }

                    throw new Error('Unexpected include of "' + path + '"');
                }
            });

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: Too few arguments to function {closure}(), ' +
            '2 passed in caller.php on line 3 and exactly 3 expected in main_module.php on line 2'
        );
    });

    it('should allow an arg to have a ternary with just a variable as the condition', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

function doubleIt($myNumber) {
    return $myNumber * 2;
}

$truthy = 21;
$result[] = doubleIt($truthy ? 10 : 4);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            20
        ]);
    });

    it('should correctly handle an undefined variable being passed as a function argument', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

$result = [];

function myFunc($myVar) {
    return $myVar;
}

$result['undef var'] = myFunc($myUndefinedVar);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('a_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'undef var': null
        });
        expect(engine.getStderr().readAll()).to.equal('PHP Notice:  Undefined variable: myUndefinedVar in a_module.php on line 10\n');
        expect(engine.getStdout().readAll()).to.equal('\nNotice: Undefined variable: myUndefinedVar in a_module.php on line 10\n');
    });

    // This test ensures that when a trace is formatted, any undefined variables or references
    // that may have been passed as arguments are handled correctly
    it('should correctly handle an undefined variable being passed as a function argument alongside a TypeError', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

function myFunc($myVar, MyClass $myObject) {
    return $myVar;
}

// Note that 21 is not an instance of MyClass so is invalid
myFunc($myUndefinedVar, 21);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Argument 2 passed to myFunc() must be an instance of MyClass, int given, ' +
            'called in /path/to/my_module.php on line 9 and defined in /path/to/my_module.php:4 ' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr
            'in /path/to/my_module.php on line 4'
        );
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice:  Undefined variable: myUndefinedVar in /path/to/my_module.php on line 9
PHP Fatal error:  Uncaught TypeError: Argument 2 passed to myFunc() must be an instance of MyClass, int given, called in /path/to/my_module.php on line 9 and defined in /path/to/my_module.php:4
Stack trace:
#0 /path/to/my_module.php(9): myFunc(NULL, 21)
#1 {main}
  thrown in /path/to/my_module.php on line 4

EOS
*/;}) //jshint ignore:line
        );
        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Notice: Undefined variable: myUndefinedVar in /path/to/my_module.php on line 9

Fatal error: Uncaught TypeError: Argument 2 passed to myFunc() must be an instance of MyClass, int given, called in /path/to/my_module.php on line 9 and defined in /path/to/my_module.php:4
Stack trace:
#0 /path/to/my_module.php(9): myFunc(NULL, 21)
#1 {main}
  thrown in /path/to/my_module.php on line 4

EOS
*/;}) //jshint ignore:line
        );
    });
});
