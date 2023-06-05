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

describe('PHP generator function statement integration', function () {
    // See also test/integration/builtin/classes/GeneratorTest.js.

    it('should be able to define a generator function', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myGenerator() {
    yield 'my value';
}

$result = [];
$generator = myGenerator();

$result['is instance of Generator'] = $generator instanceof Generator;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'is instance of Generator': true
        });
    });
});
