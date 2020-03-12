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

describe('PHP variable-instance-property "->$..." integration', function () {
    it('should allow an instance property to be referenced dynamically', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public $myProp = 21;
}

$myObject = new MyClass;
$myName = 'myProp';

$result = [
    'without brackets' => $myObject->$myName,
    'bracketed' => $myObject->{$myName}
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'without brackets': 21,
            'bracketed': 21
        });
    });
});
