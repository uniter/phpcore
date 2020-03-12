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

describe('PHP multiplication-assignment operator "*=" integration', function () {
    it('should support multiplying the number contained in a variable or property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp = 10;
    public static $myStaticProp = 100;
}
$myObject = new MyClass;
$myNumber = 1000;

$result = [];

// Multiply a variable
$myNumber *= 4;
$result['variable'] = $myNumber;

// Multiply an accessor
$myAccessor *= 5;
$result['accessor'] = $myAccessor;

// Multiply an instance property
$myObject->myInstanceProp *= 17;
$result['instance prop'] = $myObject->myInstanceProp;

// Multiply a static property
MyClass::$myStaticProp *= 21;
$result['static prop'] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            accessorValue = 21;

        engine.defineGlobalAccessor('myAccessor', function () {
            return accessorValue;
        }, function (newValue) {
            accessorValue = newValue;
        });

        expect(engine.execute().getNative()).to.deep.equal({
            'variable': 1000 * 4,
            'accessor': 21 * 5,
            'instance prop': 10 * 17,
            'static prop': 100 * 21
        });
    });
});
