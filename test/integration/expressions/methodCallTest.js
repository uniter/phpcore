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

describe('PHP synchronous method call integration', function () {
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
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.equal(32);
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Strict standards: Non-static method ClassOne::methodOne() should not be called statically, ' +
            'assuming $this from incompatible context\n'
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
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal('beforeafter');
        expect(engine.getStderr().readAll()).to.equal('PHP Notice: Undefined variable: this\n');
    });

    it('should correctly handle attempting to access $this from a static method', function () {
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
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(function () {
            engine.execute();
        }).to.throw(PHPFatalError, 'PHP Fatal error: Using $this when not in object context');
        expect(engine.getStdout().readAll()).to.equal('before');
        expect(engine.getStderr().readAll()).to.equal('PHP Fatal error: Using $this when not in object context');
    });
});
