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

describe('PHP subtraction-assignment operator "-=" integration', function () {
    it('should support subtracting from the number contained in a variable or property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp = 10;
    public static $myStaticProp = 100;
}
$myObject = new MyClass;
$myNumber = 1000;

$result = [];

// Subtract from a variable
$myNumber -= 4;
$result[] = $myNumber;

// Subtract from an accessor
$myAccessor -= 6;
$result[] = $myAccessor;

// Subtract from an instance property
$myObject->myInstanceProp -= 17;
$result[] = $myObject->myInstanceProp;

// Subtract from a static property
MyClass::$myStaticProp -= 21;
$result[] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            accessorValue = 50;

        engine.defineGlobalAccessor('myAccessor', function () {
            return accessorValue;
        }, function (newValue) {
            accessorValue = newValue;
        });

        expect(engine.execute().getNative()).to.deep.equal([
            1000 - 4, // Variable
            50 - 6,   // Accessor
            10 - 17,  // Instance property
            100 - 21  // Static property
        ]);
    });
});
