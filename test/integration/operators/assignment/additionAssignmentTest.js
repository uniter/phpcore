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

describe('PHP addition-assignment operator "+=" integration', function () {
    it('should support adding to the number contained in a variable or property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp = 10;
    public static $myStaticProp = 100;
}
$myObject = new MyClass;
$myNumber = 1000;

$result = [];

// Add to a variable
$myNumber += 4;
$result[] = $myNumber;

// Add to an accessor
$myAccessor += 5;
$result[] = $myAccessor;

// Add to an instance property
$myObject->myInstanceProp += 17;
$result[] = $myObject->myInstanceProp;

// Add to a static property
MyClass::$myStaticProp += 21;
$result[] = MyClass::$myStaticProp;

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

        expect(engine.execute().getNative()).to.deep.equal([
            1000 + 4, // Variable
            21 + 5,   // Accessor
            10 + 17,  // Instance property
            100 + 21  // Static property
        ]);
    });
});
