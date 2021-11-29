/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/* jshint bitwise:false */
'use strict';

var expect = require('chai').expect,
    nowdoc = require('nowdoc'),
    tools = require('../../tools');

describe('PHP bitwise-left-shift-assignment operator "<<=" integration', function () {
    it('should support shifting by the number contained in a variable or property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp = 26;
    public static $myStaticProp = 100;
}
$myObject = new MyClass;
$myNumber = 1000;

$result = [];

// Shift a variable
$myNumber <<= 4;
$result['shift variable'] = $myNumber;

// Shift an accessor
$myAccessor <<= 3;
$result['shift accessor'] = $myAccessor;

// Shift an instance property, fetching operand from an async pausing accessor
$myObject->myInstanceProp <<= $mySeven;
$result['shift instance prop'] = $myObject->myInstanceProp;

// Shift a static property
MyClass::$myStaticProp <<= 2;
$result['shift static prop'] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            accessorValue = 21;
        engine.defineGlobalAccessor('mySeven', function () {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(7);
                });
            });
        });
        engine.defineGlobalAccessor('myAccessor', function () {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(accessorValue);
                });
            });
        }, function (newValue) {
            accessorValue = newValue;
        });

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'shift variable': 1000 << 4,
                'shift accessor': 21 << 3,
                'shift instance prop': 26 << 7,
                'shift static prop': 100 << 2
            });
        });
    });
});