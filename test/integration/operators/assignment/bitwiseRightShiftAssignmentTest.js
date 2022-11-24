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

describe('PHP bitwise-right-shift-assignment operator ">>=" integration', function () {
    it('should support shifting by the number contained in a variable or property', async function () {
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
$myNumber >>= 4;
$result['shift variable'] = $myNumber;

// Shift an accessor
$myAccessor >>= 3;
$result['shift accessor'] = $myAccessor;

// Shift an instance property, fetching operand from an async pausing accessor
$myObject->myInstanceProp >>= $myThree;
$result['shift instance prop'] = $myObject->myInstanceProp;

// Shift a static property
MyClass::$myStaticProp >>= 2;
$result['shift static prop'] = MyClass::$myStaticProp;

// Shift a variable that is then re-assigned within a later operand.
${($myNumber = 24) && false ?: 'myNumber'} >>= ${($myNumber = 2) && false ?: 'myNumber'};
$result['assignment within operand'] = $myNumber;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            accessorValue = 21;
        engine.defineGlobalAccessor('myThree', function () {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(3);
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

        expect((await engine.execute()).getNative()).to.deep.equal({
            'shift variable': 1000 >> 4,
            'shift accessor': 21 >> 3,
            'shift instance prop': 26 >> 3,
            'shift static prop': 100 >> 2,
            'assignment within operand': 6
        });
    });
});
