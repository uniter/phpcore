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

describe('PHP list(...) construct integration', function () {
    it('should correctly handle assigning an array to a list with elements skipped', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$array = [21, 'hello', 22, 'world'];

list(, $val2, , $val4) = $array;

return [$val2, $val4];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'hello',
            'world'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle assigning an integer to a list by nulling the target variables', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$val1 = 1;
$val2 = 2;

list(, $val1, , $val2) = 21;

return [$val1, $val2];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            null,
            null
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
