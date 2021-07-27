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

describe('PHP logical "or" operator integration', function () {
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

$result[] = returnTruthy() || returnTruthy();
$result[] = 'done truthy || truthy';

$result[] = returnTruthy() || returnFalsy();
$result[] = 'done truthy || falsy';

$result[] = returnFalsy() || returnTruthy();
$result[] = 'done falsy || truthy';

$result[] = returnFalsy() || returnFalsy();
$result[] = 'done falsy || falsy';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            // truthy || truthy should short-circuit, not evaluating the second returnTruthy()
            '[in returnTruthy]',
            true,
            'done truthy || truthy',

            // truthy || falsy should short-circuit, not evaluating returnFalsy()
            '[in returnTruthy]',
            true,
            'done truthy || falsy',

            // falsy || truthy should not short-circuit, evaluating both
            '[in returnFalsy]',
            '[in returnTruthy]',
            true,
            'done falsy || truthy',

            // falsy || falsy should not short-circuit, evaluating both
            '[in returnFalsy]',
            '[in returnFalsy]',
            false,
            'done falsy || falsy'
        ]);
    });
});
