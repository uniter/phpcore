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
    tools = require('../tools');

describe('PHP decrement "--" operator integration', function () {
    it('should be able to decrement an instance property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public $myProp = 21;
}

$result = [];
$object = new MyClass;

$result[] = $object->myProp;
$result[] = $object->myProp--;
$result[] = --$object->myProp;
$result[] = $object->myProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            21, // Post-decrement won't have been able to update the property yet
            19, // Previous post-decrement plus this pre-decrement
            19
        ]);
    });

    it('should be able to decrement a static property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public static $myStaticProp = 21;
}

$result = [];

$result[] = MyClass::$myStaticProp;
$result[] = MyClass::$myStaticProp--;
$result[] = --MyClass::$myStaticProp;
$result[] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            21, // Post-decrement won't have been able to update the property yet
            19, // Previous post-decrement plus this pre-decrement
            19
        ]);
    });
});
