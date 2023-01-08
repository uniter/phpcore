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
    phpCommon = require('phpcommon'),
    tools = require('../../../../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP builtin FFI function auto-coercion return type integration', function () {
    it('should convert a numeric string to int in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return my_func(21);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            resultValue;
        engine.defineCoercingFunction(
            'my_func',
            function (myNumber) {
                return myNumber + '   '; // Append some whitespace to treat as string.
            },
            'int $myNumber : int'
        );

        resultValue = await engine.execute();

        expect(resultValue.getType()).to.equal('int');
        expect(resultValue.getNative()).to.equal(21);
    });

    it('should allow a boolean to be returned for boolean return type in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return [
    'for positive number' => is_positive(21),
    'for negative number' => is_positive(-100)
];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction(
            'is_positive',
            function (myNumber) {
                return myNumber >= 0;
            },
            'int $myNumber : bool'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'for positive number': true,
            'for negative number': false
        });
    });

    it('should raise a fatal error when return value does not match return type in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
my_invalid_func(21);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction(
            'my_invalid_func',
            function (myNumber) {
                return 'I am not a valid int result ' + myNumber;
            },
            'int $myNumber : int'
        );

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: my_invalid_func(): Return value must be of type int, ' +
            'string returned in (unknown) on line (unknown)'
        );
    });
});
