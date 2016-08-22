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

describe('PHP class static call overloading integration', function () {
    it('should use the magic __callStatic(...) method when the method is not defined', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public function aMethod() {}

    public static function __call($name, $args)
    {
        return 'wrong - I should not be used for static calls';
    }

    public static function __callStatic($name, $args)
    {
        return $name . ' :: ' . $args[0] * $args[1];
    }
}

return MyClass::myUndefinedMethod(20, 3);
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal('myUndefinedMethod :: 60');
    });
});
