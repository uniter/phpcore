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
    tools = require('../tools');

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
});
