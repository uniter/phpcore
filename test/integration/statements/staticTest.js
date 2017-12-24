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

describe('PHP "static" variable scope integration', function () {
    it('should preserve the value of a static variable between calls', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myFunc()
{
    static $myVar = 21;

    $myVar += 2;

    return $myVar;
}

$result = [];
$result[] = myFunc();
$result[] = myFunc();

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            23,
            25
        ]);
    });

    it('should support unnecessary static variables in the global scope', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

static $myVar = 21;

$result = [];
$result[] = $myVar++;
$result[] = $myVar++;

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            22
        ]);
    });
});
