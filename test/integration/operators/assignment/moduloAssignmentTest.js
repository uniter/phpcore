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

describe('PHP modulo-assignment operator "%=" integration', function () {
    it('should support dividing the number contained in a variable or property', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp = 17;
    public static $myStaticProp = 109;
}
$myObject = new MyClass;
$myNumber = 1007;

$result = [];

// Modulo a variable.
$myNumber %= 4;
$result['with variable'] = $myNumber;

// Modulo an accessor.
$myAccessor %= 5;
$result['with accessor'] = $myAccessor;

// Modulo an instance property.
$myObject->myInstanceProp %= $myTwo;
$result['with instance prop'] = $myObject->myInstanceProp;

// Modulo a static property.
MyClass::$myStaticProp %= 5;
$result['with static prop'] = MyClass::$myStaticProp;

// Modulo a variable that is then re-assigned within a later operand.
${($myNumber = 17) && false ?: 'myNumber'} %= ${($myNumber = 6) && false ?: 'myNumber'};
$result['assignment within operand'] = $myNumber;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            accessorValue = 28;
        engine.defineGlobalAccessor('myTwo', function () {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(2);
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
            'with variable': 1007 % 4,
            'with accessor': 28 % 5,
            'with instance prop': 17 % 2,
            'with static prop': 109 % 5,
            'assignment within operand': 17 % 6
        });
    });
});
