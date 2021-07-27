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

describe('PHP concatenation-assignment operator ".=" integration', function () {
    it('should support appending to the string contained in a variable or property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myInstanceProp = 'foo';
    public static $myStaticProp = 'monday';
}
$myObject = new MyClass;
$myString = 'hello';

$result = [];

// Append to a variable
$myString .= ' world';
$result['with variable'] = $myString;

// Append to an accessor
$myAccessor .= ' back';
$result['with accessor'] = $myAccessor;

// Append to an instance property
$myObject->myInstanceProp .= $myBar;
$result['with instance prop'] = $myObject->myInstanceProp;

// Append to a static property
MyClass::$myStaticProp .= ' tuesday';
$result['with static prop'] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            engine = module(),
            accessorValue = 'welcome';
        engine.defineGlobalAccessor('myBar', function () {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(' bar');
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
                'with variable': 'hello world',
                'with accessor': 'welcome back',
                'with instance prop': 'foo bar',
                'with static prop': 'monday tuesday'
            });
        });
    });
});
