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
$result['with variable'] = $myNumber;

// Add to an accessor
$myAccessor += 5;
$result['with accessor'] = $myAccessor;

// Add to an instance property
$myObject->myInstanceProp += $mySeventeen;
$result['with instance prop'] = $myObject->myInstanceProp;

// Add to a static property
MyClass::$myStaticProp += 21;
$result['with static prop'] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module(),
            accessorValue = 21;
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

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'with variable': 1000 +4,
                'with accessor': 21 +5,
                'with instance prop': 10 +17,
                'with static prop': 100 +21
            });
        });
    });
});
