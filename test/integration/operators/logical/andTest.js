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

describe('PHP logical "and" operator integration', function () {
    it('should support short-circuit evaluation', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function returnTruthy() {
    global $result;

    $result[] = '[in returnTruthy]';

    return true;
}

function returnFalsy() {
    global $result;

    $result[] = '[in returnFalsy]';

    return false;
}

$result = [];

$result[] = returnFalsy() && returnTruthy();
$result[] = 'done falsy && truthy';

$result[] = returnTruthy() && returnFalsy();
$result[] = 'done truthy && falsy';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            // falsy && truthy should short-circuit, not evaluating returnTruthy()
            '[in returnFalsy]',
            false,
            'done falsy && truthy',

            // truthy && falsy should not short-circuit, evaluating both
            '[in returnTruthy]',
            '[in returnFalsy]',
            false,
            'done truthy && falsy'
        ]);
    });
});
