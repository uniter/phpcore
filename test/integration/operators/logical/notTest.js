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

describe('PHP logical "not" operator integration', function () {
    it('should support short-circuit evaluation', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$truthy = new stdClass;
$falsy = 0;

$result = [];

$result['not truthy'] = !$truthy;
$result['not falsy'] = !$falsy;
$result['not-not truthy'] = !!$truthy;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'not truthy': false,
            'not falsy': true,
            'not-not truthy': true
        });
    });
});
