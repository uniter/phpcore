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

describe('PHP variable-variable "$$..." integration', function () {
    it('should allow a variable to be referenced dynamically', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myVar = 21;
$myName = 'myVar';

$result = [
    'with adjacent dollars' => $$myName,
    'bracketed' => ${$myName}
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'with adjacent dollars': 21,
            'bracketed': 21
        });
    });
});
