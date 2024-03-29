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

describe('PHP "switch" statement integration', function () {
    it('should support switches with constant case expressions', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$myVar = 21;

function doIt($op, $val1, $val2) {
    switch ($op) {
        case 'add':
            $opResult = $val1 + $val2;
            break;
        case 'multiply':
            $opResult = $val1 * $val2;
            break;
        default:
            $opResult = '[unknown op result]';
            break;
    }

    return $opResult;
}

$result['add'] = doIt('add', 100, 21);
$result['multiply'] = doIt('multiply', 10, 3);
$result['unknown op'] = doIt('some unknown op', 'blah', 'blah');

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'add': 121,
            'multiply': 30,
            'unknown op': '[unknown op result]'
        });
    });

    it('should support switches where a case falls-through to the default one', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$myVar = 21;

function doIt($op, $val1, $val2) {
    switch ($op) {
        case 'add':
            $opResult = $val1 + $val2;
            break;
        case 'multiply':
            $opResult = $val1 * $val2;
            break;
        case 'unknown special': // Deliberately falls-through to the default case.
        default:
            $opResult = '[unknown op result]';
            break;
    }

    return $opResult;
}

$result['add'] = doIt('add', 100, 21);
$result['multiply'] = doIt('multiply', 10, 3);
$result['unknown special'] = doIt('unknown special', 'a', 'b');
$result['unknown op'] = doIt('some unknown op', 'blah', 'blah');

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'add': 121,
            'multiply': 30,
            'unknown special': '[unknown op result]',
            'unknown op': '[unknown op result]'
        });
    });

    it('should support switches with default case in positions other than last', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$myVar = 21;

function doIt($op, $val1, $val2) {
    switch ($op) {
        case 'add':
            $opResult = $val1 + $val2;
            break;
        default:
            $opResult = '[unknown op result]';
            break;
        case 'multiply':
            $opResult = $val1 * $val2;
            break;
    }

    return $opResult;
}

$result['add'] = doIt('add', 100, 21);
$result['multiply'] = doIt('multiply', 10, 3);
$result['unknown op'] = doIt('some unknown op', 'blah', 'blah');

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'add': 121,
            'multiply': 30,
            'unknown op': '[unknown op result]'
        });
    });

    it('should support pause/resume', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$myVar = get_async(21);

function doIt($op, $val1, $val2) {
    switch (get_async($op)) {
        case 'add':
            $opResult = get_async($val1) + get_async($val2);
            break;
        default:
            $opResult = get_async('[unknown op result]');
            break;
        case get_async('multiply'):
            $opResult = get_async($val1 * get_async($val2));
            break;
    }

    return get_async($opResult);
}

$result['add'] = doIt('add', get_async(100), 21);
$result['multiply'] = get_async(doIt('multiply', 10, 3));
$result['unknown op'] = doIt('some unknown op', 'blah', 'blah');

return get_async($result);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineCoercingFunction('get_async', function (value) {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve(value);
                });
            });
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'add': 121,
            'multiply': 30,
            'unknown op': '[unknown op result]'
        });
    });
});
