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
$result[] = $myString;

// Append to an accessor
$myAccessor .= ' back';
$result[] = $myAccessor;

// Append to an instance property
$myObject->myInstanceProp .= ' bar';
$result[] = $myObject->myInstanceProp;

// Append to a static property
MyClass::$myStaticProp .= ' tuesday';
$result[] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            accessorValue = 'welcome';

        engine.defineGlobalAccessor('myAccessor', function () {
            return accessorValue;
        }, function (newValue) {
            accessorValue = newValue;
        });

        expect(engine.execute().getNative()).to.deep.equal([
            'hello world',   // Variable
            'welcome back',  // Accessor
            'foo bar',       // Instance property
            'monday tuesday' // Static property
        ]);
    });
});
