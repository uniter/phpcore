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

describe('PHP bitwise-OR-assignment operator "|=" integration', function () {
    it('should support ORing with the number contained in a variable or property', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp = 26;
    public static $myStaticProp = 100;
}
$myObject = new MyClass;
$myNumber = 1000;

$result = [];

// OR with a variable
$myNumber |= 63;
$result['with variable'] = $myNumber;

// OR with an accessor
$myAccessor |= 7;
$result['with accessor'] = $myAccessor;

// OR with an instance property, fetching operand from an async pausing accessor
$myObject->myInstanceProp |= $mySeven;
$result['with instance prop'] = $myObject->myInstanceProp;

// OR with a static property
MyClass::$myStaticProp |= 15;
$result['with static prop'] = MyClass::$myStaticProp;

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

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with variable': 1000 | 63,
            'with accessor': 21 | 7,
            'with instance prop': 26 | 7,
            'with static prop': 100 | 15
        });
    });
});
