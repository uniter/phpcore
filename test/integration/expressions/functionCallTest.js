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

describe('PHP function call integration', function () {
    it('should treat function names as case-insensitive', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            22,
            23
        ]);
    });

    it('should allow by-ref parameters to have default values', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            42,
            1000,
            42
        ]);
    });

    it('should raise a fatal error if an integer is passed when a reference is expected', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction(&$myRef)
{
    $myRef = 21;
}

myFunction(21);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/your_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: myFunction(): Argument #1 ($myRef) could not be passed by reference in /path/to/your_module.php on line 7'
        );
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: myFunction(): Argument #1 ($myRef) could not be passed by reference in /path/to/your_module.php:7
Stack trace:
#0 {main}
  thrown in /path/to/your_module.php on line 7

EOS
*/;}) //jshint ignore:line
        );
        // NB: Stdout should have a leading newline written out just before the message.
        expect(engine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught Error: myFunction(): Argument #1 ($myRef) could not be passed by reference in /path/to/your_module.php:7
Stack trace:
#0 {main}
  thrown in /path/to/your_module.php on line 7

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should raise a fatal error if a user-defined function is called missing an argument (exact count)', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction($firstArg, $secondArg, $thirdArg)
{
    print 'I should not be reached';
}

include 'caller.php';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('main_module.php', php),
            engine = module({
                // Perform the call from a separate script so that we can test
                // that the caller & callee file paths given in the error message are correct
                include: function (path, promise) {
                    if (path === 'caller.php') {
                        promise.resolve(tools.asyncTranspile(path, '<?php\n\n\nmyFunction(21, 42);'));
                        return;
                    }

                    throw new Error('Unexpected include of "' + path + '"');
                }
            });

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: Too few arguments to function myFunction(), ' +
            '2 passed in caller.php on line 4 and exactly 3 expected in main_module.php on line 2'
        );
    });

    it('should allow a variable containing an array to be passed by-reference', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            101,
            'added'
        ]);
    });

    it('should support calling static and instance methods with arrays', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            14, // 10 + 4
            40  // 20 * 2
        ]);
    });

    it('should allow a closure to be called where an argument is an array literal containing a named element with a variable as a value', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'Result: 101'
        ]);
    });

    it('should raise a fatal error if a closure is called missing an argument (exact count)', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myFunction = function ($firstArg, $secondArg, $thirdArg) {
    print 'I should not be reached';
};

include 'caller.php';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('main_module.php', php),
            engine = module({
                // Perform the call from a separate script so that we can test
                // that the caller & callee file paths given in the error message are correct
                include: function (path, promise) {
                    if (path === 'caller.php') {
                        promise.resolve(tools.asyncTranspile(path, '<?php\n\n$myFunction(21, 42);'));
                        return;
                    }

                    throw new Error('Unexpected include of "' + path + '"');
                }
            });

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: Too few arguments to function {closure}(), ' +
            '2 passed in caller.php on line 3 and exactly 3 expected in main_module.php on line 2'
        );
    });

    it('should allow an arg to have a ternary with just a variable as the condition', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            20
        ]);
    });

    it('should correctly handle passing a variable as by-value argument that is then re-assigned within a later argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

function myFunc($arg1, $arg2) {
    return $arg1 + $arg2;
}

$yourVar = 100;

$result['value assignment within argument'] = myFunc(${($myVar = 21) && false ?: 'myVar'}, ${($myVar = 32) && false ?: 'myVar'});
$result['reference assignment within argument'] = myFunc(${($myVar = 21) && false ?: 'myVar'}, ${($myVar =& $yourVar) && false ?: 'myVar'});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            // Value should be resolved at the point the argument is passed.
            'value assignment within argument': 53,

            // First argument should use the original value
            // and not the reference assigned within the second argument.
            'reference assignment within argument': 121
        });
    });

    it('should correctly handle passing an undefined variable as by-value argument that is then re-assigned within a later argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

function myFunc($arg1, $arg2) {
    return $arg1 + $arg2;
}

$yourVar = 100;

$result['value assignment within argument'] = myFunc($myVar, ${($myVar = 32) && false ?: 'myVar'});
$result['reference assignment within argument'] = myFunc($myVar, ${($myVar =& $yourVar) && false ?: 'myVar'});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            // Value should be resolved (resulting in a notice as it is undefined)
            // at the point the argument is passed.
            'value assignment within argument': 32,

            // First argument should use the original value
            // and not the reference assigned within the second argument.
            'reference assignment within argument': 132
        });
        expect(engine.getStderr().readAll()).to.equal('PHP Notice:  Undefined variable: myVar in /path/to/my_module.php on line 12\n');
        expect(engine.getStdout().readAll()).to.equal('\nNotice: Undefined variable: myVar in /path/to/my_module.php on line 12\n');
    });

    it('should correctly handle passing a variable as by-reference argument that is then re-assigned within a later argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

function myFunc(&$arg1, &$arg2) {
    return $arg1 + $arg2;
}

$yourVar = 100;

$result['value assignment within argument'] = myFunc(${($myVar = 21) && false ?: 'myVar'}, ${($myVar = 32) && false ?: 'myVar'});
$result['reference assignment within argument'] = myFunc(${($myVar = 21) && false ?: 'myVar'}, ${($myVar =& $yourVar) && false ?: 'myVar'});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            // Value should only be resolved when the addition is performed.
            'value assignment within argument': 64,

            // First argument should use the original value
            // and not the reference assigned within the second argument.
            'reference assignment within argument': 121
        });
    });

    it('should resolve references at the time the argument is evaluated', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

function myFunc(&$first, $second)
{
    return "myFunc('$first', '$second')";
}

$result = [];

$myVar = 'mine';
$yourVar = 'yours';

// FIXME: There is a precedence issue with "=&" here, worked around with parentheses for now.
$result['myFunc()'] = myFunc($myVar, ${($myVar =& $yourVar) && false ?: 'myVar'});
$result['myVar'] = $myVar;
$result['yourVar'] = $yourVar;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'myFunc()': 'myFunc(\'mine\', \'yours\')',
            'myVar': 'yours',
            'yourVar': 'yours'
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle assigning to a by-reference argument after the original variable has had a reference assigned', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

function myFunc(&$first, $second)
{
    // Take a reference to the by-ref parameter and assign it to a local variable.
    $myLocalVar =& $first;

    // Now write to the local variable with the reference assigned.
    $myLocalVar .= ' [updated]';

    return "myFunc('$first', '$second')";
}

$result = [];

$myVar = 'mine';
$yourVar = 'yours';

// Assign a reference to $myVar: note that inside myFunc a reference to the parameter will be taken too.
$result['myFunc()'] = myFunc($myVar, ${($myVar =& $yourVar) && false ?: 'myVar'});
$result['myVar'] = $myVar;
$result['yourVar'] = $yourVar;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'myFunc()': 'myFunc(\'mine [updated]\', \'yours\')',
            'myVar': 'yours',
            'yourVar': 'yours'
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should only evaluate by-reference arguments on the initial call and not on async resume', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

function myFunc($first, &$second)
{
    global $myOneAccessor;

    return $myOneAccessor + $first * $second;
}

$result = [];

$result['with all accessors'] = myFunc($myThreeAccessor, $myFourAccessor);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            log = [];
        engine.defineGlobalAccessor('myOneAccessor', function () {
            log.push('[myOneAccessor read]');

            return this.createAsyncPresentValue(1);
        });
        engine.defineGlobalAccessor('myThreeAccessor', function () {
            log.push('[myThreeAccessor read]');

            return this.createAsyncPresentValue(3);
        });
        engine.defineGlobalAccessor('myFourAccessor', function () {
            log.push('[myFourAccessor read]');

            return this.createAsyncPresentValue(4);
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with all accessors': 13
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
        expect(log).to.deep.equal([
            '[myThreeAccessor read]',
            '[myFourAccessor read]',
            '[myOneAccessor read]',
            '[myFourAccessor read]'
        ]);
    });

    it('should correctly handle an undefined variable being passed as a function argument', async function () {
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
            module = tools.asyncTranspile('a_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'undef var': null
        });
        expect(engine.getStderr().readAll()).to.equal('PHP Notice:  Undefined variable: myUndefinedVar in a_module.php on line 10\n');
        expect(engine.getStdout().readAll()).to.equal('\nNotice: Undefined variable: myUndefinedVar in a_module.php on line 10\n');
    });

    // This test ensures that when a trace is formatted, any undefined variables or references
    // that may have been passed as arguments are handled correctly.
    it('should correctly handle an undefined variable being passed as a function argument alongside a TypeError', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: myFunc(): Argument #2 ($myObject) must be of type MyClass, int given, ' +
            'called in /path/to/my_module.php on line 9 and defined in /path/to/my_module.php:4 ' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr
            'in /path/to/my_module.php on line 4'
        );
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice:  Undefined variable: myUndefinedVar in /path/to/my_module.php on line 9
PHP Fatal error:  Uncaught TypeError: myFunc(): Argument #2 ($myObject) must be of type MyClass, int given, called in /path/to/my_module.php on line 9 and defined in /path/to/my_module.php:4
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

Fatal error: Uncaught TypeError: myFunc(): Argument #2 ($myObject) must be of type MyClass, int given, called in /path/to/my_module.php on line 9 and defined in /path/to/my_module.php:4
Stack trace:
#0 /path/to/my_module.php(9): myFunc(NULL, 21)
#1 {main}
  thrown in /path/to/my_module.php on line 4

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should raise a fatal error on uncallable values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$myBooleanFuncName = true;

try {
    $myBooleanFuncName(21);
} catch (Throwable $throwable) {
    $result['boolean value'] = $throwable::class .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

$myFloatFuncName = 123.456;

try {
    $myFloatFuncName(21);
} catch (Throwable $throwable) {
    $result['float value'] = $throwable::class .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

$myIntFuncName = 27;

try {
    $myIntFuncName(21);
} catch (Throwable $throwable) {
    $result['int value'] = $throwable::class .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

$myNullFuncName = null;

try {
    $myNullFuncName(21);
} catch (Throwable $throwable) {
    $result['null value'] = $throwable::class .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'boolean value': 'Error: Value of type boolean is not callable @ /path/to/my_module.php:7',
            'float value': 'Error: Value of type float is not callable @ /path/to/my_module.php:21',
            'int value': 'Error: Value of type int is not callable @ /path/to/my_module.php:35',
            'null value': 'Error: Value of type null is not callable @ /path/to/my_module.php:49'
        });
    });
});
