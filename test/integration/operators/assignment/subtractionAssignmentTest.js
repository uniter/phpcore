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
    it('should support subtracting from the number contained in a variable or property', async function () {
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
$result['with variable'] = $myNumber;

// Subtract from an accessor
$myAccessor -= 6;
$result['with accessor'] = $myAccessor;

// Subtract from an instance property
$myObject->myInstanceProp -= $mySeventeen;
$result['with instance prop'] = $myObject->myInstanceProp;

// Subtract from a static property
MyClass::$myStaticProp -= 21;
$result['with static prop'] = MyClass::$myStaticProp;

// Subtract from a variable that is then re-assigned within a later operand.
${($myNumber = 100) && false ?: 'myNumber'} -= ${($myNumber = 7) && false ?: 'myNumber'};
$result['assignment within operand'] = $myNumber;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            accessorValue = 50;
        engine.defineGlobalAccessor('mySeventeen', function () {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(17);
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
            'with variable': 1000 - 4,
            'with accessor': 50 - 6,
            'with instance prop': 10 - 17,
            'with static prop': 100 - 21,
            'assignment within operand': 93
        });
    });
});
