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

describe('PHP builtin FFI function non-coercion scalar type integration', function () {
    it('should support installing a custom function with coercing by-ref integer parameter used in weak type-checking mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$myVar = '21 ';
$result['myVar before'] = $myVar;

// $myVar should be converted to integer and the result written back by scalar type handling.
take_int($myVar);

$result['myVar after'] = $myVar;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('take_int', function () {}, 'int &$myParam');

        expect(engine.execute().getNative()).to.deep.equal({
            'myVar before': '21 ',
            'myVar after': 21
        });
    });

    it('should raise a fatal error when a by-ref integer parameter is given an array argument', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myVar = ['my array'];

add_one_to($myVar);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.defineNonCoercingFunction('add_one_to', function () {}, 'int &$myNumber');

        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Argument 1 passed to add_one_to() ' +
            'must be of the type int, array given, called in /path/to/my_module.php on line 5 ' +
            'and defined in unknown:unknown in unknown on line unknown'
        );
    });
});
