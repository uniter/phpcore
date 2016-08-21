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
    tools = require('./tools');

describe('PHP class constant integration', function () {
    it('should support the magic ::class constant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Awesome\Space
{
    class MyClass
    {
    }
}

namespace
{
    return My\Awesome\Space\MyClass::class;
}
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal('My\\Awesome\\Space\\MyClass');
    });
});
