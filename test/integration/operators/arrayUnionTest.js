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

describe('PHP array union operator "+" integration', function () {
    it('should merge the arrays correctly giving precedence to the left-hand array in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$indexedArray1 = ['first', 'second'];
$indexedArray2 = ['third', 'fourth', 'fifth'];

$associativeArray1 = ['a' => 'one', 'b' => 'two'];
$associativeArray2 = ['b' => 'three', 'a' => 'four', 'c' => 'five'];

$result['two indexed arrays'] = $indexedArray1 + $indexedArray2;
$result['two associative arrays'] = $associativeArray1 + $associativeArray2;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'two indexed arrays': ['first', 'second', 'fifth'], // Array 1's keys should take precedence

            'two associative arrays': {
                a: 'one', // Array 1's keys should take precedence
                b: 'two',
                c: 'five'
            }
        });
    });

    it('should merge the arrays correctly giving precedence to the left-hand array in async mode with pauses', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$indexedArray1 = get_async(['first', 'second']);
$indexedArray2 = get_async(['third', 'fourth', 'fifth']);

$associativeArray1 = ['a' => 'one', 'b' => 'two'];
$associativeArray2 = ['b' => 'three', 'a' => 'four', 'c' => 'five'];

$result['two indexed arrays'] = get_async($indexedArray1) + get_async($indexedArray2);
$result['two associative arrays'] = get_async($associativeArray1) + get_async($associativeArray2);

return get_async($result);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'two indexed arrays': ['first', 'second', 'fifth'], // Array 1's keys should take precedence

                'two associative arrays': {
                    a: 'one', // Array 1's keys should take precedence
                    b: 'two',
                    c: 'five'
                }
            });
        });
    });
});
