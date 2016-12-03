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

describe('PHP multiplication operator "*" integration', function () {
    it('should support multiplying different types of value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    20 * 3,
    10.4 * 2,
    15 * true,
    20 * null
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            60,   // Integer multiplication
            20.8, // Multiplication of float
            15,   // Multiplication by 1 (true coerced to 1)
            0     // Multiplication by 0 (null coerces to 0)
        ]);
    });
});
