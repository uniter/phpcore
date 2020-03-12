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

describe('PHP reference assignment operator instance property integration', function () {
    it('should implicitly define both the left and right sides when right side is undefined', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myObject = new stdClass;
$myObject->myRefProperty =& $myObject->myUndefinedProperty;

$result = [
    'myRefProperty' => $myObject->myRefProperty,
    'myUndefinedProperty' => $myObject->myUndefinedProperty
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefProperty': null,
            'myUndefinedProperty': null
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle assigning a reference then assigning a reference to the right side', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myObject = new stdClass;
$myObject->myProperty = 21;

// This should create a ReferenceSlot for myRefProperty2, assigned to both myRefProperty1 & myRefProperty2
$myObject->myRefProperty1 =& $myObject->myRefProperty2;
// This should disconnect myRefProperty2 from myRefProperty1, creating a ReferenceSlot for myProperty
// that stores the int(21) inside, then change myRefProperty2 and myProperty to both reference the new slot
$myObject->myRefProperty2 =& $myObject->myProperty;

$myObject->myProperty = 101; // Later modify the referenced property to ensure references are actually being used

$result = [
    'myRefProperty1' => $myObject->myRefProperty1,
    'myRefProperty2' => $myObject->myRefProperty2,
    'myProperty' => $myObject->myProperty
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

$myObject = new stdClass;
$myObject->myRefProperty1 = 21;

// This should create a ReferenceSlot for myRefProperty1 that stores the int(21) inside,
// then change both myRefProperty1 and myRefProperty2 to reference the new slot
$myObject->myRefProperty2 =& $myObject->myRefProperty1;
// This should disconnect myRefProperty1 from the slot that now contains its original int(21),
// creating a new ReferenceSlot for both myRefProperty1 and myProperty to refer to with an implicit value of null
$myObject->myRefProperty1 =& $myObject->myProperty;

$myObject->myProperty = 101; // Later modify the referenced property to ensure myRefProperty1 and myProperty both now resolve to this

$result = [
    'myRefProperty1' => $myObject->myRefProperty1,
    'myRefProperty2' => $myObject->myRefProperty2,
    'myProperty' => $myObject->myProperty
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

$myObject = new stdClass;
$myObject->myRefProperty1 = 21;

// This should create a ReferenceSlot for myRefProperty1 that stores the int(21) inside,
// then change both myRefProperty1 and myRefProperty2 to reference the new slot
$myObject->myRefProperty2 =& $myObject->myRefProperty1;
// This should change myRefProperty3 to refer to the slot for myRefProperty1 created above
$myObject->myRefProperty3 =& $myObject->myRefProperty1;

$myObject->myRefProperty1 = 101; // Later modify the referenced property to ensure all 3 propertys both now resolve to this

$result = [
    'myRefProperty1' => $myObject->myRefProperty1,
    'myRefProperty2' => $myObject->myRefProperty2,
    'myRefProperty3' => $myObject->myRefProperty3
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
