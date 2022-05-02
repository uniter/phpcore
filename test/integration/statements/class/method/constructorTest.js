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
    tools = require('../../../tools');

describe('PHP class statement constructor integration', function () {
    it('should support PHP4-style constructors named the same as the class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    class MyClass
    {
        public $myProp;

        public function MyClass($myArg)
        {
            $this->myProp = $myArg * 2;
        }
    }
}

namespace {
    $myObject = new My\Stuff\MyClass(21);

    $result = [];
    $result[] = $myObject->myProp;
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            42
        ]);
        expect(engine.getStderr().readAll()).to.equal(''); // No warnings or notices expected
    });

    it('should give precedence to __construct() over PHP4-style constructor', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace
{
    ini_set('error_reporting', E_ALL & E_STRICT);
}

namespace My\Stuff
{
    class MyClass
    {
        public $myProp;

        // This one should be overridden (with a strict warning raised)
        public function MyClass($myArg)
        {
            $this->myProp = $myArg * 10;
        }

        public function __construct($myArg)
        {
            $this->myProp = $myArg * 2;
        }
    }
}

namespace {
    $myObject = new My\Stuff\MyClass(21);

    $result = [];
    $result[] = $myObject->myProp;
    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            42
        ]);
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Strict standards:  Redefining already defined constructor for class MyClass in /path/to/my_module.php on line 10\n'
        );
    });

    it('should support pauses in the userland __construct() method for the current class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MyClass
{
    public $fixedProp = 'original value';
    public $modifiedProp = 'original value';

    public function __construct()
    {
        $this->modifiedProp = get_async('new value');
    }
}

$myObject = new MyClass;

$result['fixed prop'] = $myObject->fixedProp;
$result['modified prop'] = $myObject->modifiedProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(value);
                });
            });
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'fixed prop': 'original value',
            'modified prop': 'new value'
        });
    });

    it('should support pauses in the userland __construct() method inherited from a super class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MySuper
{
    public function __construct()
    {
        $this->modifiedProp = get_async('new value');
    }
}

class MyClass extends MySuper
{
    public $fixedProp = 'original value';
    public $modifiedProp = 'original value';
}

$myObject = new MyClass;

$result['fixed prop'] = $myObject->fixedProp;
$result['modified prop'] = $myObject->modifiedProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(value);
                });
            });
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'fixed prop': 'original value',
            'modified prop': 'new value'
        });
    });

    it('should support pauses in a userland __construct() method called from another', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class FirstClass
{
    public $firstProp;

    public function __construct()
    {
        $this->firstProp = new SecondClass;
    }
}

class SecondClass
{
    public $secondProp = 'original value in SecondClass';

    public function __construct()
    {
        $this->secondProp = get_async('new value in SecondClass');
    }
}

$myObject = new FirstClass;

$result['prop from SecondClass via FirstClass'] = $myObject->firstProp->secondProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createAsyncPresentValue(value);
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'prop from SecondClass via FirstClass': 'new value in SecondClass'
        });
    });

    it('should support default parameter values being used for non-provided arguments', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MyClass
{
    public $myProp = 'original value';

    public function __construct($myString = 'new value')
    {
        $this->myProp = get_async($myString);
    }
}

$myObject = new MyClass;

$result['prop from MyClass'] = $myObject->myProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createAsyncPresentValue(value);
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'prop from MyClass': 'new value'
        });
    });
});
