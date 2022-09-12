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

describe('PHP closure/anonymous function integration', function () {
    it('should allow a normal closure to call itself recursively', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$fibonacci = function ($number) use (&$fibonacci) {
    if ($number < 2) {
        return $number;
    } else {
        return $fibonacci($number - 1) + $fibonacci($number - 2);
    }
};

return [
    'Fib of 6' => $fibonacci(6),
    'Fib of 9' => $fibonacci(9)
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'Fib of 6': 8,
            'Fib of 9': 34
        });
    });

    it('should allow a static closure to call itself recursively', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// NB: The only difference between this and the test above is the "static" keyword here
$fibonacci = static function ($number) use (&$fibonacci) {
    if ($number < 2) {
        return $number;
    } else {
        return $fibonacci($number - 1) + $fibonacci($number - 2);
    }
};

return [
    'Fib of 6' => $fibonacci(6),
    'Fib of 9' => $fibonacci(9)
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'Fib of 6': 8,
            'Fib of 9': 34
        });
    });

    it('should allow a normal closure to access $this', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    private $myProp = 21;

    public function myMethod()
    {
        $c = function () {
            return $this->myProp;
        };

        return $c();
    }
}

$object = new MyClass();

return $object->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(21);
    });

    it('should allow a closure to be called both directly and via ->__invoke(...)', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    private $myProp = 21;

    public function myMethod()
    {
        return function ($myNumber) {
            return [
                'result' => $this->myProp + $myNumber,
                'trace' => (new \Exception)->getTraceAsString()
            ];
        };
    }
}

$myObject = new MyClass();
$myClosure = $myObject->myMethod();

return [
    'called directly' => $myClosure(10),
    'called via __invoke(...)' => $myClosure->__invoke(20)
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'called directly': {
                'result': 31,
                'trace': nowdoc(function () {/*<<<EOS
#0 /some/module/path.php(22): MyClass->{closure}(10)
#1 {main}
EOS
*/;}) //jshint ignore:line
            },
            'called via __invoke(...)': {
                'result': 41,
                'trace': nowdoc(function () {/*<<<EOS
#0 /some/module/path.php(23): MyClass->{closure}(20)
#1 /some/module/path.php(23): Closure->__invoke(20)
#2 {main}
EOS
*/;}) //jshint ignore:line
            }
        });
    });

    it('should not allow a static closure to access $this', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff;

class MyClass
{
    private $myProp = 21;

    public function myMethod()
    {
        $c = static function () {
            return $this->myProp;
        };

        return $c();
    }
}

$object = new MyClass();

return $object->myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Using $this when not in object context in /some/module/path.php on line 12'
        );
        // Stdout (and stderr) should have the file/line combination in colon-separated format
        expect(engine.getStdout().readAll()).to.equal(
            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught Error: Using $this when not in object context in /some/module/path.php:12
Stack trace:
#0 /some/module/path.php(15): My\Stuff\MyClass::My\Stuff\{closure}()
#1 /some/module/path.php(21): My\Stuff\MyClass->myMethod()
#2 {main}
  thrown in /some/module/path.php on line 12

EOS
*/;}) //jshint ignore:line
        );
        // Stderr should have the whole message prefixed with "PHP " and two spaces before "Uncaught ..."
        expect(engine.getStderr().readAll()).to.equal(
            // There should be no space between the "before" string printed and the error message
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: Using $this when not in object context in /some/module/path.php:12
Stack trace:
#0 /some/module/path.php(15): My\Stuff\MyClass::My\Stuff\{closure}()
#1 /some/module/path.php(21): My\Stuff\MyClass->myMethod()
#2 {main}
  thrown in /some/module/path.php on line 12

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should allow a by-reference closure parameter to be passed an undefined variable without notice being raised', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myClosure = function (&$myArg) {
    $myArg = 21;
};

$myClosure($myTarget);

return $myTarget;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(21);
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should take a copy of the value of a by-value closure binding at definition time', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$myClosures = [];

foreach (['first', 'second', 'third'] as $suffix) {
    $myClosure = function ($message) use ($suffix) {
        return $message . ' ' . $suffix;
    };

    $myClosures[] = $myClosure;
}

$result['first closure'] = $myClosures[0]('my');
$result['second closure'] = $myClosures[1]('your');
$result['third closure'] = $myClosures[2]('our');

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'first closure': 'my first',
            'second closure': 'your second',
            'third closure': 'our third'
        });
    });

    it('should not take a copy of the value of a by-reference closure binding at definition time', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$myClosures = [];

foreach (['first', 'second', 'third'] as $suffix) {
    $myClosure = function ($message) use (&$suffix) {
        return $message . ' ' . $suffix;
    };

    $myClosures[] = $myClosure;
}

$result['first closure'] = $myClosures[0]('my');
$result['second closure'] = $myClosures[1]('your');
$result['third closure'] = $myClosures[2]('our');

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'first closure': 'my third',
            'second closure': 'your third',
            'third closure': 'our third'
        });
    });

    it('should support a by-reference closure binding being assigned null', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$myVar = 21;

$myClosure = function () use (&$myVar) {
    $myVar = null;
};

$result['before call'] = $myVar;
$myClosure();
$result['after call'] = $myVar;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'before call': 21,
            'after call': null
        });
    });

    it('should handle an exception being thrown inside a closure', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$myClosure = function ($myFailure) {
    throw new Exception('My failure is: ' . $myFailure);
};

try {
    $myClosure('Bang!');
} catch (Throwable $throwable) {
    $result['standard Exception'] = $throwable::class .
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
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'standard Exception': 'Exception: My failure is: Bang! @ /some/module/path.php:5'
        });
    });
});
