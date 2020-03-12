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

describe('PHP reference assignment operator variable integration', function () {
    it('should implicitly define both the left and right sides when right side is undefined', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myRefVar =& $myUndefinedVar;

$result = [
    'myRefVar' => $myRefVar,
    'myUndefinedVar' => $myUndefinedVar
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefVar': null,
            'myUndefinedVar': null
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle assigning a reference then assigning a reference to the right side', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myVar = 21;

// This should create a ReferenceSlot for $myRefVar2, assigned to both $myRefVar1 & $myRefVar2
$myRefVar1 =& $myRefVar2;
// This should disconnect $myRefVar2 from $myRefVar1, creating a ReferenceSlot for $myVar
// that stores the int(21) inside, then change $myRefVar2 and $myVar to both reference the new slot
$myRefVar2 =& $myVar;

$myVar = 101; // Later modify the referenced var to ensure references are actually being used

$result = [
    'myRefVar1' => $myRefVar1,
    'myRefVar2' => $myRefVar2,
    'myVar' => $myVar
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefVar1': null,
            'myRefVar2': 101,
            'myVar': 101
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle assigning a reference to a variable while keeping another reference to its original value slot', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myRefVar1 = 21;

// This should create a ReferenceSlot for $myRefVar1 that stores the int(21) inside,
// then change both $myRefVar1 and $myRefVar2 to reference the new slot
$myRefVar2 =& $myRefVar1;
// This should disconnect $myRefVar1 from the slot that now contains its original int(21),
// creating a new ReferenceSlot for both $myRefVar1 and $myVar to refer to with an implicit value of null
$myRefVar1 =& $myVar;

$myVar = 101; // Later modify the referenced var to ensure $myRefVar1 and $myVar both now resolve to this

$result = [
    'myRefVar1' => $myRefVar1,
    'myRefVar2' => $myRefVar2,
    'myVar' => $myVar
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefVar1': 101,
            'myRefVar2': 21,
            'myVar': 101
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle a variable with a reference being referenced', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$myRefVar1 = 21;

// This should create a ReferenceSlot for $myRefVar1 that stores the int(21) inside,
// then change both $myRefVar1 and $myRefVar2 to reference the new slot
$myRefVar2 =& $myRefVar1;
// This should change $myRefVar3 to refer to the slot for $myRefVar1 created above
$myRefVar3 =& $myRefVar1;

$myRefVar1 = 101; // Later modify the referenced var to ensure all 3 variables now resolve to this

$result = [
    'myRefVar1' => $myRefVar1,
    'myRefVar2' => $myRefVar2,
    'myRefVar3' => $myRefVar3
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'myRefVar1': 101,
            'myRefVar2': 101,
            'myRefVar3': 101
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });
});
