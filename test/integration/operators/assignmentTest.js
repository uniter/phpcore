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

describe('PHP assignment operator integration', function () {
    it('should return the value assigned for object property and array element writes', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myObject = new stdClass();
$myArray = [];

$result[] = ($myObject->myProp = 21);
$result[] = ($myArray[25] = 22);

// Assigning variable references should return the value assigned too
$target1 = 23;
$target2 = 24;
$result[] = ($myObject->myProp =& $target1);
$result[] = ($myArray[25] =& $target2);

// Assigning array element references should return the value assigned
$anotherArray = [21 => 'element ref 1', 22 => 'element ref 2'];
$result[] = ($myObject->myProp =& $anotherArray[21]);
$result[] = ($myArray[25] =& $anotherArray[22]);

// Assigning object property references should return the value assigned
$anotherObject = (object)['prop1' => 'prop ref 1', 'prop2' => 'prop ref 2'];
$result[] = ($myObject->myProp =& $anotherObject->prop1);
$result[] = ($myArray[25] =& $anotherObject->prop2);

// Assigning to property of array element should return the value assigned
$myArray[21] = $myObject;
$result[] = ($myArray[21]->myProp = 27);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            22,
            23,
            24,
            'element ref 1',
            'element ref 2',
            'prop ref 1',
            'prop ref 2',
            27
        ]);
    });

    it('should allow an array literal to replace a variable with a new array containing the old value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myArray = [21];
$myArray = [
    'old' => $myArray
];
$result[] = $myArray;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            {
                old: [21]
            }
        ]);
    });

    it('should recursively copy arrays for assignment (shallow copy, except for nested arrays, unless references)', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$firstArray = [21];
$secondArray = [$firstArray];
$thirdArray = [&$firstArray];

// $thirdArray _should_ be affected as $firstArray was embedded by reference
$firstArray[] = 'I should not affect $secondArray';

$result['firstArray'] = $firstArray;
$result['secondArray'] = $secondArray;
$result['thirdArray'] = $thirdArray;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            firstArray: [21, 'I should not affect $secondArray'],
            secondArray: [[21]],
            thirdArray: [[21, 'I should not affect $secondArray']]
        });
    });
});
