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

describe('PHP builtin FFI function auto-coercion scalar type integration', function () {
    it('should support installing a custom function with coercing scalar parameter used in weak type-checking mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['int arg given'] = double_it(7);
$result['string arg given (coercion needed)'] = double_it('8');
$result['no arg given'] = double_it();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('double_it', function (number) {
            return number * 2;
        }, 'int $myNumber = 21');

        expect((await engine.execute()).getNative()).to.deep.equal({
            'int arg given': 14,
            'string arg given (coercion needed)': 16,
            'no arg given': 42
        });
    });

    it('should raise a fatal error when an integer parameter is given an array argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['with array'] = i_want_an_integer(['my' => 'array']); // Not an integer!

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('i_want_an_integer', function () {}, 'int $myInteger');

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: i_want_an_integer(): ' +
            'Argument #1 ($myInteger) must be of type int, array given in /path/to/my_module.php on line 4'
        );
    });
});
