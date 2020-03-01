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

describe('PHP reference assignment operator array element integration', function () {
    it('should implicitly define both the left and right sides when right side is undefined', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myArray = [];
$myArray['myRefElement'] =& $myArray['myUndefinedElement'];

$result = [
    'myRefElement' => $myArray['myRefElement'],
    'myUndefinedElement' => $myArray['myUndefinedElement']
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefElement': null,
            'myUndefinedElement': null
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle assigning a reference then assigning a reference to the right side', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myArray = [];
$myArray['myElement'] = 21;

// This should create a ReferenceSlot for myRefElement2, assigned to both myRefElement1 & myRefElement2
$myArray['myRefElement1'] =& $myArray['myRefElement2'];
// This should disconnect myRefElement2 from myRefElement1, creating a ReferenceSlot for myElement
// that stores the int(21) inside, then change myRefElement2 and myElement to both reference the new slot
$myArray['myRefElement2'] =& $myArray['myElement'];

$myArray['myElement'] = 101; // Later modify the referenced element to ensure references are actually being used

$result = [
    'myRefElement1' => $myArray['myRefElement1'],
    'myRefElement2' => $myArray['myRefElement2'],
    'myElement' => $myArray['myElement']
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefElement1': null,
            'myRefElement2': 101,
            'myElement': 101
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle assigning a reference to an element while keeping another reference to its original value slot', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myArray = [];
$myArray['myRefElement1'] = 21;

// This should create a ReferenceSlot for myRefElement1 that stores the int(21) inside,
// then change both myRefElement1 and myRefElement2 to reference the new slot
$myArray['myRefElement2'] =& $myArray['myRefElement1'];
// This should disconnect myRefElement1 from the slot that now contains its original int(21),
// creating a new ReferenceSlot for both myRefElement1 and myElement to refer to with an implicit value of null
$myArray['myRefElement1'] =& $myArray['myElement'];

$myArray['myElement'] = 101; // Later modify the referenced element to ensure myRefElement1 and myElement both now resolve to this

$result = [
    'myRefElement1' => $myArray['myRefElement1'],
    'myRefElement2' => $myArray['myRefElement2'],
    'myElement' => $myArray['myElement']
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefElement1': 101,
            'myRefElement2': 21,
            'myElement': 101
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle an element with a reference being referenced', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myArray = [];
$myArray['myRefElement1'] = 21;

// This should create a ReferenceSlot for myRefElement1 that stores the int(21) inside,
// then change both myRefElement1 and myRefElement2 to reference the new slot
$myArray['myRefElement2'] =& $myArray['myRefElement1'];
// This should change myRefElement3 to refer to the slot for myRefElement1 created above
$myArray['myRefElement3'] =& $myArray['myRefElement1'];

$myArray['myRefElement1'] = 101; // Later modify the referenced element to ensure all 3 elements both now resolve to this

$result = [
    'myRefElement1' => $myArray['myRefElement1'],
    'myRefElement2' => $myArray['myRefElement2'],
    'myRefElement3' => $myArray['myRefElement3']
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefElement1': 101,
            'myRefElement2': 101,
            'myRefElement3': 101
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });
});
