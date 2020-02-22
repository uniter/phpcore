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

describe('PHP bitwise OR operator "|" integration', function () {
    it('should support bitwise OR operations', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['small integers'] = 2 | 1;
$result['large integers'] = 123456781 | 777777777;
$result['floats'] = 1234.5678 | 567.123;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'small integers': 3,            // 0b10 | 0b01 = 0b11
            'large integers': 794558333,    // Large unsigned integers should be supported too
            'floats': 1783
        });
    });
});
