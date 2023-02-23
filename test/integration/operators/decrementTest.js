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
    it('should be able to decrement a variable or variable reference', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$myNumber = 21;
$myRef =& $myNumber;

$result['initial number'] = $myNumber;
$result['initial ref'] = $myRef;
$result['number post-dec'] = $myNumber--;
$result['ref post-dec'] = $myRef--;
$result['number pre-dec'] = --$myNumber;
$result['ref pre-dec'] = --$myRef;
$result['final number'] = $myNumber;
$result['final ref'] = $myRef;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'initial number': 21,
            'initial ref': 21,
            'number post-dec': 21, // Post-decrement won't have been able to update the property yet
            'ref post-dec': 20,    // The previous post-decrement will have updated the property by now
            'number pre-dec': 18,
            'ref pre-dec': 17,
            'final number': 17,
            'final ref': 17
        });
    });

    it('should be able to decrement an instance property', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            21, // Post-decrement won't have been able to update the property yet
            19, // Previous post-decrement plus this pre-decrement
            19
        ]);
    });

    it('should be able to decrement a static property', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            21, // Post-decrement won't have been able to update the property yet
            19, // Previous post-decrement plus this pre-decrement
            19
        ]);
    });

    it('should correctly handle decrementing a string', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myString = '21';
$myString--;
$result['numeric string'] = $myString;

$myString = '21  ';
$myString--;
$result['numeric string with trailing whitespace'] = $myString;

$myString = '101xyz';
$myString--;
$result['leading numeric string'] = $myString;

$myString = 'not numeric';
$myString--;
$result['non-numeric string'] = $myString;

$myString = '';
$myString--;
$result['non-numeric empty string'] = $myString;

$myString = 'a';
$myString--;
$result['non-numeric string "a"'] = $myString;

$myString = '#a';
$myString--;
$result['non-numeric string "#a"'] = $myString;

$myString = '#az';
$myString--;
$result['non-numeric string "#az"'] = $myString;

$myString = 'aa';
$myString--;
$result['non-numeric string "aa"'] = $myString;

$myString = 'zz';
$myString--;
$result['non-numeric string "zz"'] = $myString;

$myString = 'ZZ';
$myString--;
$result['non-numeric string "ZZ"'] = $myString;

$myString = 'Zz';
$myString--;
$result['non-numeric string "Zz"'] = $myString;

$myString = 'zZ';
$myString--;
$result['non-numeric string "zZ"'] = $myString;

$myString = ' 1z';
$myString--;
$result['non-numeric string " 1z"'] = $myString;

$myString = ' 9z';
$myString--;
$result['non-numeric string " 9z"'] = $myString;

$myString = ' a.';
$myString--;
$result['non-numeric string " a."'] = $myString;

$myString = '    9z    ';
$myString--;
$result['non-numeric string "    9z    "'] = $myString;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'numeric string': 20,
            'numeric string with trailing whitespace': 20,
            'leading numeric string': '101xyz',

            // There are no alphanumeric decrement rules to apply.
            // Incrementing an alphanumeric string is possible, however.
            'non-numeric string': 'not numeric',
            'non-numeric empty string': -1,
            'non-numeric string "a"': 'a',
            'non-numeric string "#a"': '#a',
            'non-numeric string "#az"': '#az',
            'non-numeric string "aa"': 'aa',
            'non-numeric string "zz"': 'zz',
            'non-numeric string "ZZ"': 'ZZ',
            'non-numeric string "Zz"': 'Zz',
            'non-numeric string "zZ"': 'zZ',
            'non-numeric string " 1z"': ' 1z',
            'non-numeric string " 9z"': ' 9z',
            'non-numeric string " a."': ' a.',
            'non-numeric string "    9z    "': '    9z    '
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
