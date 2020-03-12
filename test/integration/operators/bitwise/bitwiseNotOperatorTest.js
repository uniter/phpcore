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

describe('PHP bitwise NOT (ones\' complement) operator "~" integration', function () {
    it('should support bitwise NOT operations', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['small integer'] = ~2;
$result['large integer'] = ~123456781;
$result['float'] = ~123.5;
$result['zero'] = ~0;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'small integer': -3,
            'large integer': -123456782,
            'float': -124, // Note truncation
            'zero': -1
        });
    });
});
