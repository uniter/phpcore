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
    it('should support installing a custom function with coercing scalar parameter used in weak type-checking mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['int arg given'] = double_it(7);
$result['string arg given (coercion needed)'] = double_it('8');
$result['no arg given'] = double_it();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('double_it', function (number) {
            return number * 2;
        }, 'int $myNumber = 21');

        expect(engine.execute().getNative()).to.deep.equal({
            'int arg given': 14,
            'string arg given (coercion needed)': 16,
            'no arg given': 42
        });
    });

    it('should raise a fatal error when an integer parameter is given an array argument', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['with array'] = i_want_an_integer(['my' => 'array']); // Not an integer!

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineCoercingFunction('i_want_an_integer', function () {}, 'int $myInteger');

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Argument 1 passed to i_want_an_integer() ' +
            'must be of the type int, array given, called in /path/to/my_module.php on line 4 ' +
            'and defined in unknown:unknown in unknown on line unknown'
        );
    });
});
