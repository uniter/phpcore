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

describe('PHP reference assignment operator static property integration', function () {
    it('should correctly handle assigning a reference then assigning a reference to the right side', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

class MyClass {
    public static $myProperty = 21;
    public static $myRefProperty1;
    public static $myRefProperty2;
}

// This should create a ReferenceSlot for myRefProperty2, assigned to both myRefProperty1 & myRefProperty2
MyClass::$myRefProperty1 =& MyClass::$myRefProperty2;
// This should disconnect myRefProperty2 from myRefProperty1, creating a ReferenceSlot for myProperty
// that stores the int(21) inside, then change myRefProperty2 and myProperty to both reference the new slot
MyClass::$myRefProperty2 =& MyClass::$myProperty;

MyClass::$myProperty = 101; // Later modify the referenced property to ensure references are actually being used

$result = [
    'myRefProperty1' => MyClass::$myRefProperty1,
    'myRefProperty2' => MyClass::$myRefProperty2,
    'myProperty' => MyClass::$myProperty
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefProperty1': null,
            'myRefProperty2': 101,
            'myProperty': 101
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle assigning a reference to a property while keeping another reference to its original value slot', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

class MyClass {
    public static $myProperty;
    public static $myRefProperty1 = 21;
    public static $myRefProperty2;
}

// This should create a ReferenceSlot for myRefProperty1 that stores the int(21) inside,
// then change both myRefProperty1 and myRefProperty2 to reference the new slot
MyClass::$myRefProperty2 =& MyClass::$myRefProperty1;
// This should disconnect myRefProperty1 from the slot that now contains its original int(21),
// creating a new ReferenceSlot for both myRefProperty1 and myProperty to refer to with an implicit value of null
MyClass::$myRefProperty1 =& MyClass::$myProperty;

MyClass::$myProperty = 101; // Later modify the referenced property to ensure ::$myRefProperty1 and ::$myProperty both now resolve to this

$result = [
    'myRefProperty1' => MyClass::$myRefProperty1,
    'myRefProperty2' => MyClass::$myRefProperty2,
    'myProperty' => MyClass::$myProperty
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefProperty1': 101,
            'myRefProperty2': 21,
            'myProperty': 101
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle a property with a reference being referenced', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

class MyClass {
    public static $myRefProperty1 = 21;
    public static $myRefProperty2;
    public static $myRefProperty3;
}

// This should create a ReferenceSlot for myRefProperty1 that stores the int(21) inside,
// then change both myRefProperty1 and myRefProperty2 to reference the new slot
MyClass::$myRefProperty2 =& MyClass::$myRefProperty1;
// This should change myRefProperty3 to refer to the slot for myRefProperty1 created above
MyClass::$myRefProperty3 =& MyClass::$myRefProperty1;

MyClass::$myRefProperty1 = 101; // Later modify the referenced property to ensure all 3 propertys both now resolve to this

$result = [
    'myRefProperty1' => MyClass::$myRefProperty1,
    'myRefProperty2' => MyClass::$myRefProperty2,
    'myRefProperty3' => MyClass::$myRefProperty3
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefProperty1': 101,
            'myRefProperty2': 101,
            'myRefProperty3': 101
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });
});
