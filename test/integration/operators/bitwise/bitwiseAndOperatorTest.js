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

describe('PHP bitwise AND operator "&" integration', function () {
    it('should support bitwise AND operations', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['small integers'] = 43 & 7;
$result['large integers'] = 123456781 & 777777777;
$result['floats'] = 1234.567 & 4567.891;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'small integers': 3,            // 0b101011 & 0b000111 = 0b000011
            'large integers': 106676225,    // Large unsigned integers should be supported too
            'floats': 210
        });
    });
});
