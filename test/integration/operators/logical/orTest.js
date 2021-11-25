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
    it('should support short-circuit evaluation in async mode', function () {
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

$result[] = get_async(returnTruthy()) || get_async(returnTruthy());
$result[] = 'done truthy || truthy';

$result[] = get_async(returnTruthy()) || get_async(returnFalsy());
$result[] = 'done truthy || falsy';

$result[] = get_async(returnFalsy()) || get_async(returnTruthy());
$result[] = 'done falsy || truthy';

$result[] = get_async(returnFalsy()) || get_async(returnFalsy());
$result[] = 'done falsy || falsy';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
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
});
