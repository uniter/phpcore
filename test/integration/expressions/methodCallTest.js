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

describe('PHP synchronous instance method call integration', function () {
    it('should correctly handle calling an instance method as static', function () {
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
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal(21);
    });

    it('should treat method names as case-insensitive', function () {
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
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal(21);
    });

    it('should allow a variable containing an array to be passed by-reference', function () {
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
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            101,
            'added'
        ]);
    });

    it('should correctly handle calling a parent instance method statically from a child instance method call', function () {
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
        return 4 + MyParent::myParentMethod();
    }
}

$object = new MyChild();
$object->myProp = 7;

return $object->myChildMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.equal(32);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle calling an instance method statically from an unrelated method', function () {
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
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.equal(32);
        // TODO: Change for PHP 7 (see https://www.php.net/manual/en/migration70.incompatible.php)
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Strict standards:  Non-static method ClassOne::methodOne() should not be called statically, ' +
            'assuming $this from incompatible context in /path/to/module.php on line 17\n'
        );
    });

    it('should correctly handle attempting to reference $this itself from a static method', function () {
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
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
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

    it('should correctly handle attempting to access a member of $this from a static method', function () {
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
            module = tools.syncTranspile('/some/module/path.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(
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

    it('should raise a fatal error on attempting to call a method of an array', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myArray = [21, 101];

$dummy = $myArray->myMethod();

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Call to a member function myMethod() on array in my_module.php on line 5'
        );
    });

    it('should raise a fatal error on attempting to call a method of an integer', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myInt = 27;

$dummy = $myInt->myMethod();

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Call to a member function myMethod() on int in my_module.php on line 5'
        );
    });
});
