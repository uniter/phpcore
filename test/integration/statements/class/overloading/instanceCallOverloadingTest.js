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

describe('PHP class instance call overloading integration', function () {
    it('should use the magic __call(...) method when the method is not defined', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function aMethod() {}

    public function __call($name, $args)
    {
        return $name . ' :: ' . $args[0] * $args[1];
    }
}

$object = new MyClass;

return $object->myUndefinedMethod(21, 2);
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal('myUndefinedMethod :: 42');
    });

    it('magic __call(...) should override __callStatic(...) when both present for static call in object context', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function firstMethod($arg1, $arg2)
    {
        return self::undefinedSecondMethod($arg1, $arg2);
    }

    public function __call($name, $args)
    {
        return 'non-static call: ' . $name . ' :: ' . $args[0] * $args[1];
    }

    public function __callStatic($name, $args)
    {
        return 'static call: ' . $name . ' :: ' . $args[0] * $args[1];
    }
}

$object = new MyClass;

return $object->firstMethod(21, 2);
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal('non-static call: undefinedSecondMethod :: 42');
    });

    it('should fall back to magic __callStatic(...) for static call in object context when __call(...) is missing', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function firstMethod($arg1, $arg2)
    {
        return self::undefinedSecondMethod($arg1, $arg2);
    }

    public function __callStatic($name, $args)
    {
        return 'static call: ' . $name . ' :: ' . $args[0] * $args[1];
    }
}

$object = new MyClass;

return $object->firstMethod(21, 2);
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal('static call: undefinedSecondMethod :: 42');
    });
});
