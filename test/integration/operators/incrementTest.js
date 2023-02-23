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
    it('should be able to increment a variable or variable reference', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$myNumber = 21;
$myRef =& $myNumber;

$result['initial number'] = $myNumber;
$result['initial ref'] = $myRef;
$result['number post-inc'] = $myNumber++;
$result['ref post-inc'] = $myRef++;
$result['number pre-inc'] = ++$myNumber;
$result['ref pre-inc'] = ++$myRef;
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
            'number post-inc': 21, // Post-increment won't have been able to update the property yet.
            'ref post-inc': 22,    // The previous post-increment will have updated the property by now.
            'number pre-inc': 24,
            'ref pre-inc': 25,
            'final number': 25,
            'final ref': 25
        });
    });

    it('should be able to increment an instance property', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            21, // Post-increment won't have been able to update the property yet.
            23, // Previous post-increment plus this pre-increment.
            23
        ]);
    });

    it('should be able to increment a static property', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            21, // Post-increment won't have been able to update the property yet.
            23, // Previous post-increment plus this pre-increment.
            23
        ]);
    });

    it('should be able to increment a magic property', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            // Initial fetch of myMagicProp.
            'get myMagicProp',
            21,

            // myMagicProp++.
            'get myMagicProp',
            'set myMagicProp to 22',
            21,

            // ++myMagicProp.
            'get myMagicProp',
            'set myMagicProp to 23',
            23
        ]);
    });

    it('should correctly handle incrementing a string', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myString = '21';
$myString++;
$result['numeric string'] = $myString;

$myString = '21  ';
$myString++;
$result['numeric string with trailing whitespace'] = $myString;

$myString = '101xyz';
$myString++;
$result['leading numeric string'] = $myString;

$myString = 'not numeric';
$myString++;
$result['non-numeric string'] = $myString;

$myString = '';
$myString++;
$result['non-numeric empty string'] = $myString;

$myString = 'a';
$myString++;
$result['non-numeric string "a"'] = $myString;

$myString = '#a';
$myString++;
$result['non-numeric string "#a"'] = $myString;

$myString = '#az';
$myString++;
$result['non-numeric string "#az"'] = $myString;

$myString = 'aa';
$myString++;
$result['non-numeric string "aa"'] = $myString;

$myString = 'zz';
$myString++;
$result['non-numeric string "zz"'] = $myString;

$myString = 'ZZ';
$myString++;
$result['non-numeric string "ZZ"'] = $myString;

$myString = 'Zz';
$myString++;
$result['non-numeric string "Zz"'] = $myString;

$myString = 'zZ';
$myString++;
$result['non-numeric string "zZ"'] = $myString;

$myString = ' 1z';
$myString++;
$result['non-numeric string " 1z"'] = $myString;

$myString = ' 9z';
$myString++;
$result['non-numeric string " 9z"'] = $myString;

$myString = ' a.';
$myString++;
$result['non-numeric string " a."'] = $myString;

$myString = '    9z    ';
$myString++;
$result['non-numeric string "    9z    "'] = $myString;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'numeric string': 22,
            'numeric string with trailing whitespace': 22,
            'leading numeric string': '101xza',

            // Alphanumeric increment rules should be applied.
            'non-numeric string': 'not numerid',
            'non-numeric empty string': '1',
            'non-numeric string "a"': 'b',
            'non-numeric string "#a"': '#b',
            'non-numeric string "#az"': '#ba',
            'non-numeric string "aa"': 'ab',
            'non-numeric string "zz"': 'aaa',
            'non-numeric string "ZZ"': 'AAA',
            'non-numeric string "Zz"': 'AAa',
            'non-numeric string "zZ"': 'aaA',
            'non-numeric string " 1z"': ' 2a',
            'non-numeric string " 9z"': ' 10a',
            'non-numeric string " a."': ' a.',
            'non-numeric string "    9z    "': '    9z    '
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
