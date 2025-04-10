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

describe('PHP function by-reference parameter integration', function () {
    it('should support functions with by-reference parameters', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myFunc(int &$myParam): void {
    $myParam = 21;
}

$result = [];
$myVar = 101;
myFunc($myVar);
$result['$myVar after call'] = $myVar;
return $result;
EOS
*/;}), //jshint ignore:line
        module = tools.asyncTranspile('/path/to/my_module.php', php),
        engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            '$myVar after call': 21
        });
    });

    it('should support returning references to by-reference parameter arguments', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function &myFunc(int &$myParam): int {
    return $myParam;
}

$result = [];

$myVar = 101;
$myRef =& myFunc($myVar);
$result['$myVar after call'] = $myVar;
$result['$myRef after call'] = $myRef;

$myVar = 1001; // Should also update $myRef via reference.
$result['$myVar after set via $myVar'] = $myVar;
$result['$myRef after set via $myVar'] = $myRef;

$myRef = 1002; // Should also update $myVar via reference.
$result['$myVar after set via $myRef'] = $myVar;
$result['$myRef after set via $myRef'] = $myRef;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            '$myVar after call': 101,
            '$myRef after call': 101,
            '$myVar after set via $myVar': 1001,
            '$myRef after set via $myVar': 1001,
            '$myVar after set via $myRef': 1002,
            '$myRef after set via $myRef': 1002
        });
    });
});
