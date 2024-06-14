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

describe('PHP array union assignment operator "+=" integration', function () {
    it('should merge the arrays correctly giving precedence to the left-hand array in async mode with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$indexedArray1 = get_async(['first', 'second']);
$indexedArray2 = get_async(['third', 'fourth', 'fifth']);

$associativeArray1 = get_async(['a' => 'one', 'b' => 'two']);
$associativeArray2 = get_async(['b' => 'three', 'a' => 'four', 'c' => 'five']);

$indexedArray1 += $indexedArray2;
$associativeArray1 += $associativeArray2;

$result['two indexed arrays'] = $indexedArray1;
$result['two associative arrays'] = $associativeArray1;

return get_async($result);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createAsyncPresentValue(value);
            };
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'two indexed arrays': ['first', 'second', 'fifth'], // Array 1's keys should take precedence.

            'two associative arrays': {
                a: 'one', // Array 1's keys should take precedence.
                b: 'two',
                c: 'five'
            }
        });
    });
});
