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

describe('PHP heredoc construct integration', function () {
    it('should support quoted and unquoted heredocs with variables interpolated', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$firstVar = 'there';
$secondVar = 'world';

$result = [];

$result[] = <<<UNQUOTED
Hello $firstVar

UNQUOTED; <-- Still inside
Goodbye $secondVar!
UNQUOTED;

$result[] = <<<"QUOTED"
Hello $firstVar

QUOTED; <-- Still inside

Goodbye!
QUOTED;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'Hello there\n\nUNQUOTED; <-- Still inside\nGoodbye world!',
            'Hello there\n\nQUOTED; <-- Still inside\n\nGoodbye!'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
