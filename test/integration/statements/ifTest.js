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
    tools = require('../tools');

describe('PHP "if" statement integration', function () {
    it('should support conditions with logical and comparison operators', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

if (1 === 2 || 7 === 4 || 3 === 3) {
    $result[] = 'yep';
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            'yep'
        ]);
    });
});
