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

describe('PHP nowdoc construct integration', function () {
    it('should support nowdocs with strings that look like variables interpolated', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = <<<'MYNOWDOC'
This is $not $a $variable

MYNOWDOC; <-- Still inside
Some more text
MYNOWDOC;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'This is $not $a $variable\n\nMYNOWDOC; <-- Still inside\nSome more text'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
