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

describe('PHP instance method call integration', function () {
    it('should correctly handle calling an instance method as static', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function myMethod()
    {
        return 21;
    }
}

return MyClass::myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(21);
    });

    it('should treat method names as case-insensitive', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function myMethod()
    {
        return 21;
    }
}

return (new MyClass)->MYMEthod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(21);
    });

    it('should allow a variable containing an array to be passed by-reference', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function myMethod(array &$theArray)
    {
        $theArray[] = 'added';
    }
}

$myArray = [21, 101];
(new MyClass)->myMethod($myArray);

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

    it('should correctly handle calling a parent instance method statically from a child instance method call', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyParent
{
    public $myProp;

    public function myParentMethod()
    {
        return $this->myProp + 21;
    }
}
class MyChild extends MyParent
{
    public function myChildMethod()
    {
        return 4 + MyParent::myParentMethod(); // Call the method on the parent with the current $this context
    }

    public function myParentMethod() // Override the method from the parent
    {
        return 'I should not be used';
    }
}

$object = new MyChild();
$object->myProp = 7;

return $object->myChildMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(32);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle calling a grandparent instance method statically from a child instance method call', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyGrandparent
{
    public $myProp;

    public function myGrandparentMethod()
    {
        return $this->myProp + 21;
    }
}
class MyParent extends MyGrandparent
{
    public function myGrandparentMethod() // Override the method from the grandparent
    {
        return 'I should not be used';
    }
}
class MyChild extends MyParent
{
    public function myChildMethod()
    {
        return 4 + MyGrandparent::myGrandparentMethod(); // Call the method on the grandparent with the current $this context
    }

    public function myGrandparentMethod() // Override the method from the grandparent and parent
    {
        return 'I should not be used either';
    }
}

$object = new MyChild();
$object->myProp = 7;

return $object->myChildMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(32);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle passing a variable as by-value argument that is then re-assigned within a later argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function myMethod($arg1, $arg2) {
        return $arg1 + $arg2;
    }
}

$result = [];

$myObject = new MyClass;
$yourVar = 100;

$result['value assignment within argument'] = $myObject->myMethod(${($myVar = 21) && false ?: 'myVar'}, ${($myVar = 32) && false ?: 'myVar'});
$result['reference assignment within argument'] = $myObject->myMethod(${($myVar = 21) && false ?: 'myVar'}, ${($myVar =& $yourVar) && false ?: 'myVar'});

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

    it('should correctly handle calling an instance method statically from an unrelated method', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Enable E_STRICT errors

class ClassOne
{
    public $myProp;

    public function methodOne()
    {
        return $this->myProp + 21;
    }
}
class ClassTwo
{
    public function methodTwo()
    {
        return 4 + ClassOne::methodOne();
    }
}

$object = new ClassTwo();
$object->myProp = 7;

return $object->methodTwo();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(32);
        // TODO: Change for PHP 7 (see https://www.php.net/manual/en/migration70.incompatible.php)
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Strict standards:  Non-static method ClassOne::methodOne() should not be called statically, ' +
            'assuming $this from incompatible context in /path/to/module.php on line 17\n'
        );
    });

    it('should correctly handle attempting to reference $this itself from a static method', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class ClassOne
{
    public static function methodOne()
    {
        return $this;
    }
}
class ClassTwo
{
    public function methodTwo()
    {
        return ClassOne::methodOne();
    }
}

$object = new ClassTwo();

print 'before';
print $object->methodTwo();
print 'after';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Using $this when not in object context in /path/to/my_module.php on line 6'
        );
        // Stdout (and stderr) should have the file/line combination in colon-separated format
        expect(engine.getStdout().readAll()).to.equal(
            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS
before
Fatal error: Uncaught Error: Using $this when not in object context in /path/to/my_module.php:6
Stack trace:
#0 /path/to/my_module.php(13): ClassOne::methodOne()
#1 /path/to/my_module.php(20): ClassTwo->methodTwo()
#2 {main}
  thrown in /path/to/my_module.php on line 6

EOS
*/;}) //jshint ignore:line
        );
        // Stderr should have the whole message prefixed with "PHP " and two spaces before "Uncaught ..."
        expect(engine.getStderr().readAll()).to.equal(
            // There should be no space between the "before" string printed and the error message
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: Using $this when not in object context in /path/to/my_module.php:6
Stack trace:
#0 /path/to/my_module.php(13): ClassOne::methodOne()
#1 /path/to/my_module.php(20): ClassTwo->methodTwo()
#2 {main}
  thrown in /path/to/my_module.php on line 6

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should correctly handle attempting to access a member of $this from a static method', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class ClassOne
{
    public $myProp;

    public static function methodOne()
    {
        return $this->myProp + 21;
    }
}
class ClassTwo
{
    public function methodTwo()
    {
        return 4 + ClassOne::methodOne();
    }
}

$object = new ClassTwo();
$object->myProp = 7;

print 'before';
print $object->methodTwo();
print 'after';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Using $this when not in object context in /some/module/path.php on line 8'
        );
        // Stdout (and stderr) should have the file/line combination in colon-separated format
        expect(engine.getStdout().readAll()).to.equal(
            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS
before
Fatal error: Uncaught Error: Using $this when not in object context in /some/module/path.php:8
Stack trace:
#0 /some/module/path.php(15): ClassOne::methodOne()
#1 /some/module/path.php(23): ClassTwo->methodTwo()
#2 {main}
  thrown in /some/module/path.php on line 8

EOS
*/;}) //jshint ignore:line
        );
        // Stderr should have the whole message prefixed with "PHP " and two spaces before "Uncaught ..."
        expect(engine.getStderr().readAll()).to.equal(
            // There should be no space between the "before" string printed and the error message
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: Using $this when not in object context in /some/module/path.php:8
Stack trace:
#0 /some/module/path.php(15): ClassOne::methodOne()
#1 /some/module/path.php(23): ClassTwo->methodTwo()
#2 {main}
  thrown in /some/module/path.php on line 8

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should raise a fatal error on attempting to call a method of an array', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myArray = [21, 101];

$dummy = $myArray->myMethod();

EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Call to a member function myMethod() on array in my_module.php on line 5'
        );
    });

    it('should raise a fatal error on attempting to call a method of an integer', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myInt = 27;

$dummy = $myInt->myMethod();

EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Call to a member function myMethod() on int in my_module.php on line 5'
        );
    });
});
