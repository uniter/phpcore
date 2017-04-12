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

describe('PHP increment "++" operator integration', function () {
    it('should be able to increment an instance property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public $myProp = 21;
}

$result = [];
$object = new MyClass;

$result[] = $object->myProp;
$result[] = $object->myProp++;
$result[] = ++$object->myProp;
$result[] = $object->myProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            21, // Post-increment won't have been able to update the property yet
            23, // Previous post-increment plus this pre-increment
            23
        ]);
    });

    it('should be able to increment a static property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    public static $myStaticProp = 21;
}

$result = [];

$result[] = MyClass::$myStaticProp;
$result[] = MyClass::$myStaticProp++;
$result[] = ++MyClass::$myStaticProp;
$result[] = MyClass::$myStaticProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            21, // Post-increment won't have been able to update the property yet
            23, // Previous post-increment plus this pre-increment
            23
        ]);
    });

    it('should be able to increment a magic property', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

class MyClass
{
    private $myProp = 21;

    public function __get($propertyName)
    {
        global $result;

        $result[] = 'get ' . $propertyName;

        return $this->myProp;
    }

    public function __set($propertyName, $value)
    {
        global $result;

        $result[] = 'set ' . $propertyName . ' to ' . $value;

        $this->myProp = $value;
    }
}

$result = [];
$object = new MyClass;

$result[] = $object->myMagicProp;
$result[] = $object->myMagicProp++;
$result[] = ++$object->myMagicProp;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            // Initial fetch of myMagicProp
            'get myMagicProp',
            21,

            // myMagicProp++
            'get myMagicProp',
            'set myMagicProp to 22',
            21,

            // ++myMagicProp
            'get myMagicProp',
            'set myMagicProp to 23',
            23
        ]);
    });
});
