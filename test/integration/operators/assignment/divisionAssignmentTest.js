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

describe('PHP division-assignment operator "/=" integration', function () {
    it('should support dividing the number contained in a variable or property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp = 10;
    public static $myStaticProp = 100;
}
$myObject = new MyClass;
$myNumber = 1000;

$result = [];

// Divide a variable
$myNumber /= 4;
$result['variable'] = $myNumber;

// Divide an accessor
$myAccessor /= 5;
$result['accessor'] = $myAccessor;

// Divide an instance property
$myObject->myInstanceProp /= 2;
$result['instance prop'] = $myObject->myInstanceProp;

// Divide a static property
MyClass::$myStaticProp /= 5;
$result['static prop'] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            accessorValue = 20;

        engine.defineGlobalAccessor('myAccessor', function () {
            return accessorValue;
        }, function (newValue) {
            accessorValue = newValue;
        });

        expect(engine.execute().getNative()).to.deep.equal({
            'variable': 1000 / 4,
            'accessor': 20 / 5,
            'instance prop': 10 / 2,
            'static prop': 100 / 5
        });
    });
});
