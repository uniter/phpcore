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

describe('PHP constructor property promotion integration', function () {
    it('should auto-assign a promoted public property from the constructor argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function __construct(public string $myName) {}
}

$obj = new MyClass('Alice');
return $obj->myName;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal('Alice');
    });

    it('should auto-assign a promoted private property and allow reading it inside the class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function __construct(private int $myCount) {}

    public function getCount()
    {
        return $this->myCount;
    }
}

$obj = new MyClass(7);
return $obj->getCount();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(7);
    });

    it('should auto-assign a promoted property when the parameter has a default value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function __construct(public int $myCount = 0) {}
}

$obj = new MyClass;
return $obj->myCount;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(0);
    });

    it('should support mixed promoted and regular constructor parameters', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function __construct(
        public string $name,
        int $age,
        private bool $active = true
    ) {}

    public function isActive()
    {
        return $this->active;
    }
}

$obj = new MyClass('Bob', 30);
$result = [];
$result['name'] = $obj->name;
$result['active'] = $obj->isActive();
return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'name': 'Bob',
            'active': true
        });
    });

    it('should auto-assign a promoted readonly property and forbid later modification', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function __construct(public readonly int $id) {}
}

$obj = new MyClass(42);
$obj->id = 99;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot modify readonly property MyClass::$id ' +
            'in /path/to/my_module.php on line 8'
        );
    });

    it('should allow the constructor body to execute after promoted property assignments', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public string $label;

    public function __construct(public string $name)
    {
        $this->label = 'Name: ' . $this->name; // Note access is via the property to test promotion order.
    }
}

$obj = new MyClass('Carol');
$result = [];
$result['name'] = $obj->name;
$result['label'] = $obj->label;
return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'name': 'Carol',
            'label': 'Name: Carol'
        });
    });
});
