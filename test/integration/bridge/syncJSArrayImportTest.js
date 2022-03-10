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

describe('PHP JS<->PHP bridge JS array import (as JSArray) synchronous mode integration', function () {
    it('should always box an imported JS array as the same JSArray PHP class instance', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return function ($object) {
    // Deliberately fetch twice as we want to test import logic
    $leftArray = $object->myArrayProp;
    $rightArray = $object->myArrayProp;

    $result = [];

    $result['left is JSArray'] = $leftArray instanceof JSArray;
    $result['right is JSArray'] = $rightArray instanceof JSArray;
    $result['JSArrays are identical (userland)'] = $leftArray === $rightArray;

    // Make a change via one variable, ensure it is reflected via the other
    $leftArray->myCustomProp = 'my custom value';
    $result['myCustomProp from left, via right (userland)'] = $rightArray->myCustomProp;

    $result['are internal values identical'] = are_internal_values_identical($leftArray, $rightArray);

    // Note that all of these reference the same element of the same array.
    $result['element of $object->myArrayProp'] = $object->myArrayProp[0];
    $result['element of $leftArray'] = $leftArray[0];
    $result['element of $rightArray'] = $rightArray[0];

    return $result;
};
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module(),
            jsObject = {
                // Use an object with a method to avoid being coerced to a nested associative array structure
                myMethod: function () { return 'my value'; },
                myArrayProp: [21, 101]
            };
        engine.defineNonCoercingFunction('are_internal_values_identical', function (leftReference, rightReference) {
            return leftReference.getValue() === rightReference.getValue();
        });

        expect(engine.execute().getNative()(jsObject)).to.deep.equal({
            'left is JSArray': true,
            'right is JSArray': true,
            'JSArrays are identical (userland)': true,
            'myCustomProp from left, via right (userland)': 'my custom value',
            'are internal values identical': true,
            'element of $object->myArrayProp': 21,
            'element of $leftArray': 21,
            'element of $rightArray': 21
        });
    });
});
