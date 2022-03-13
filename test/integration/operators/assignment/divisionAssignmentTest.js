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
$result['with variable'] = $myNumber;

// Divide an accessor
$myAccessor /= 5;
$result['with accessor'] = $myAccessor;

// Divide an instance property
$myObject->myInstanceProp /= $myTwo;
$result['with instance prop'] = $myObject->myInstanceProp;

// Divide a static property
MyClass::$myStaticProp /= 5;
$result['with static prop'] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            accessorValue = 20;
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

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'with variable': 1000 / 4,
                'with accessor': 20 / 5,
                'with instance prop': 10 / 2,
                'with static prop': 100 / 5
            });
        });
    });
});
