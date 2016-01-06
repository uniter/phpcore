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
    tools = require('./tools');

describe('PHP super global variable integration', function () {
    it('should support fetching super globals both inside and outside of functions', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function getItPlusOne() {
    return $MY_SUPER_GLOBAL + 1;
}

$result[] = $MY_SUPER_GLOBAL;
$result[] = getItPlusOne();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.defineSuperGlobal('MY_SUPER_GLOBAL', 21);

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            22
        ]);
    });

    it('should support assigning to super globals and storing the new value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function addOneToIt() {
    $MY_SUPER_GLOBAL = $MY_SUPER_GLOBAL + 1;
}

$result[] = $MY_SUPER_GLOBAL;
addOneToIt();
$result[] = $MY_SUPER_GLOBAL;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.defineSuperGlobal('MY_SUPER_GLOBAL', 30);

        expect(engine.execute().getNative()).to.deep.equal([
            30,
            31
        ]);
    });
});
