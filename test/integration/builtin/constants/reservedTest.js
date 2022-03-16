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

describe('PHP builtin reserved constant integration', function () {
    it('should support the standard reserved constants', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return [
    'PHP_EOL' => PHP_EOL,
    'PHP_INT_MAX' => PHP_INT_MAX,
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            PHP_EOL: '\n',
            PHP_INT_MAX: Number.MAX_SAFE_INTEGER
        });
    });
});
