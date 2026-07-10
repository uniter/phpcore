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

describe('PHP class typed instance property integration', function () {
    it('should support writing to and reading from a public typed instance property outside the class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public int $count;
}

$obj = new MyClass;
$obj->count = 21;
return $obj->count;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(21);
    });

    it('should support typed instance properties with default values', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public string $myProp = 'my default value';
}

$obj = new MyClass;
return $obj->myProp;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal('my default value');
    });

    it('should allow writing to and reading from a typed static property', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public static int $myProp = 0;
}

MyClass::$myProp = 42;
return MyClass::$myProp;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(42);
    });

    it('should allow assigning a readonly property once in a constructor', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public readonly int $myId;

    public function __construct(int $myId)
    {
        $this->myId = $myId;
    }
}

$obj = new MyClass(99);
return $obj->myId;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(99);
    });

    it('should raise a fatal error when attempting to modify a readonly property after initialisation outside the class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public readonly int $id;

    public function __construct(int $id)
    {
        $this->id = $id;
    }
}

$obj = new MyClass(1);
$obj->id = 2;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot modify readonly property MyClass::$id ' +
            'in /path/to/my_module.php on line 13'
        );
    });

    it('should allow taking a reference to a typed property and reading/writing through it', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public int $myCount = 10;
}

$obj = new MyClass;
$ref =& $obj->myCount;
$ref = 42;
return $obj->myCount;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(42);
    });

    it('should raise a fatal error when attempting to assign an incompatible type to a typed property via reference', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public int $myCount = 10;
}

$obj = new MyClass;
$ref =& $obj->myCount;
$ref = 'not an int';
return $obj->myCount;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Cannot assign string to reference held by property MyClass::$myCount ' +
            'of type int in /path/to/my_module.php:9' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr.
            ' in /path/to/my_module.php on line 9'
        );
    });

    it('should raise a fatal error when assigning an incompatible type to a typed instance property', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public int $myCount = 0;
}

$obj = new MyClass;
$obj->myCount = 'not an int';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Cannot assign string to property MyClass::$myCount ' +
            'of type int in /path/to/my_module.php on line 8'
        );
    });

    it('should raise a fatal error when assigning an incompatible type to a typed static property', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public static int $myCount = 0;
}

MyClass::$myCount = 'not an int';
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Cannot assign string to property MyClass::$myCount ' +
            'of type int in /path/to/my_module.php on line 7'
        );
    });

    it('should raise a fatal error when attempting to take a reference to a readonly property', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public readonly int $id;

    public function __construct(int $id)
    {
        $this->id = $id;
    }
}

$obj = new MyClass(7);
$ref =& $obj->id;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            // Note an Error and not a TypeError here.
            'PHP Fatal error: Uncaught Error: Cannot indirectly modify readonly property MyClass::$id ' +
            'in /path/to/my_module.php on line 13'
        );
    });
});
