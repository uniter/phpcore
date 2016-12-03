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

describe('PHP division operator "/" integration', function () {
    it('should support dividing different types of value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    20 / 5,
    10.4 / 2,
    15 / true,
    null / 20
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            4,   // Integer division
            5.2, // Float division
            15,  // Division by 1 (true coerced to 1)
            0    // Division of 0 (null coerces to 0) - note that this isn't division *by* zero
        ]);
    });
});
