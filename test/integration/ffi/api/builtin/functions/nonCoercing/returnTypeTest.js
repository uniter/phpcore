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
    tools = require('../../../../../tools');

describe('PHP builtin FFI function non-coercion return type integration', function () {
    it('should convert a numeric string to int in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return my_func(21);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            resultValue;
        engine.defineNonCoercingFunction(
            'my_func',
            function (myNumberValue) {
                // Append some whitespace to treat as string.
                return this.valueFactory.createString(myNumberValue.getNative() + '   ');
            },
            'int $myNumber : int'
        );

        resultValue = await engine.execute();

        expect(resultValue.getType()).to.equal('int');
        expect(resultValue.getNative()).to.equal(21);
    });

    it('should support installing a custom function with coercing by-ref integer return type used in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$initialVar = '21 ';
$result['initialVar before call'] = $initialVar;

// A reference to $initialVar should be passed through and returned. On return,
// it should be converted to integer and the result written back by scalar type handling.
$returnedVar =& pass_reference($initialVar);

$result['initialVar after call'] = $initialVar;
$result['returnedVar after call'] = $returnedVar;

$initialVar = 1001; // Should also update $returnedVar via reference.

$result['initialVar after set'] = $initialVar;
$result['returnedVar after set'] = $returnedVar;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('pass_reference', function (paramReference) {
            return paramReference; // Just return the reference right back.
        }, 'mixed &$myParam : &int');

        expect((await engine.execute()).getNative()).to.deep.equal({
            'initialVar before call': '21 ',
            'initialVar after call': 21, // Should have been converted due to scalar int return type.
            'returnedVar after call': 21,
            'initialVar after set': 1001,
            'returnedVar after set': 1001 // Should have been updated via reference.
        });
    });
});
