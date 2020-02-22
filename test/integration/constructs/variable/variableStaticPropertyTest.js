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
    tools = require('../../tools');

describe('PHP variable-static-property "::$..." integration', function () {
    it('should allow a static property to be referenced dynamically', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public static $myProp = 1001;
}

$myName = 'myProp';

$result = [
    'without brackets' => MyClass::$$myName,
    'bracketed' => MyClass::${$myName}
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'without brackets': 1001,
            'bracketed': 1001
        });
    });
});
