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

describe('PHP void return type integration', function () {
    it('should allow functions that have no explicit return or return void', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function noExplicitReturn($myNumber) : void {
    global $result;

    $result['no explicit return'] = $myNumber;
}

function returnVoid($myNumber) : void {
    global $result;

    $result['return void'] = $myNumber;

    return;

    $result['return void (should never be reached!)'] = 'I should not be reached';
}

noExplicitReturn(21);
returnVoid(101);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'no explicit return': 21,
            'return void': 101
        });
    });
});
