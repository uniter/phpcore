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

describe('PHP identity operator "+" integration', function () {
    it('should support getting the identity of references and values', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$firstVar = -21;
$secondVar = 58;
$myArray = ['myElement' => "-101"]; // Use a string to check for coercion

return [
    '+ of negative variable value' => +$firstVar,
    '+ of positive variable value' => +$secondVar,
    '+ of negative array element value string' => +$myArray['myElement']
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            '+ of negative variable value': -21, // Note that the value will not be made positive as you may expect
            '+ of positive variable value': 58,
            '+ of negative array element value string': -101 // As above
        });
    });
});
