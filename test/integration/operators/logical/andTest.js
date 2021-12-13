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
    it('should support short-circuit evaluation in async mode with pauses', function () {
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

$result[] = get_async(returnFalsy()) && get_async(returnFalsy());
$result[] = 'done falsy && falsy';

// On resume, the result of the above &&'s LHS must be kept so that
// execution of the RHS will _not_ occur, otherwise opcode indexes will be incorrect
if (get_async(21) === 21) {
    $result[] = '[async control]';
}

$result[] = get_async(returnFalsy()) && get_async(returnTruthy());
$result[] = 'done falsy && truthy';

$result[] = get_async(returnTruthy()) && get_async(returnFalsy());
$result[] = 'done truthy && falsy';

$result[] = get_async(returnTruthy()) && get_async(returnTruthy());
$result[] = 'done truthy && truthy';

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
                // falsy && falsy should short-circuit, not evaluating the second returnFalsy()
                '[in returnFalsy]',
                false,
                'done falsy && falsy',

                // (Ensures that logical term results are stored - see notes above)
                '[async control]',

                // falsy && truthy should short-circuit, not evaluating returnTruthy()
                '[in returnFalsy]',
                false,
                'done falsy && truthy',

                // truthy && falsy should not short-circuit, evaluating both
                '[in returnTruthy]',
                '[in returnFalsy]',
                false,
                'done truthy && falsy',

                // truthy && truthy should not short-circuit, evaluating both
                '[in returnTruthy]',
                '[in returnTruthy]',
                true,
                'done truthy && truthy'
            ]);
        });
    });

    it('should support fetching an operand from accessor returning future in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

// Read the value from the accessor as an operand.
$result['accessor read && bool'] = $myAccessor && true;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('my value');
                    });
                });
            }
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'accessor read && bool': true
        });
    });
});
