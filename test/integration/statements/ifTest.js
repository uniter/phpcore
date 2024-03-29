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

describe('PHP "if" statement integration', function () {
    it('should support conditions with logical and comparison operators', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

if (1 === 2 || 7 === 4 || 3 === 3) {
    $result[] = 'yep';
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'yep'
        ]);
    });

    it('should support if conditions reading an instance property inside a closure passed as function arg', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function callIt($aFunction) {
    $aFunction();
}

callIt(function () {
    global $result;

    $myObject = new stdClass;
    $myObject->myProp = true;

    if ($myObject->myProp) {
        $result[] = 'found';
    }
});

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'found'
        ]);
    });

    it('should support pause/resume', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = get_async('first');

function testAsync($value)
{
    global $result;
    $result[] = get_async('second');

    if (get_async($value) === get_async(1000)) {
        $result[] = get_async('third') . get_async(' and a concat');
    } elseif (get_async($value) === get_async(1001)) {
        $result[] = get_async('fourth');
    } else {
        $result[] = get_async('fifth');
    }

    return get_async($value);
}

$result[] = get_async('sixth');
$result[] = testAsync(get_async(1000));

$result[] = get_async('seventh');
$result[] = testAsync(get_async(1001));

$result[] = get_async('eighth');
$result[] = testAsync(get_async(99999));

$result[] = get_async('ninth');

return $result;
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

        expect((await engine.execute()).getNative()).to.deep.equal([
            'first',
            'sixth',
            'second',
            'third and a concat',
            1000,
            'seventh',
            'second',
            'fourth',
            1001,
            'eighth',
            'second',
            'fifth',
            99999,
            'ninth'
        ]);
    });

    it('should support fetching the condition from accessor returning future in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

// Read the value from the accessor as the condition.
if ($myAccessor) {
    $result['accessor in condition'] = 'yes';
}

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
            'accessor in condition': 'yes'
        });
    });
});
