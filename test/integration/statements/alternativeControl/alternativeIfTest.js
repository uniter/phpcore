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

describe('PHP alternative control structure "if" statement integration', function () {
    it('should support conditions with logical and comparison operators', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

if (1 === 2 || 7 === 4 || 3 === 3):
    $result[] = 'yep';
endif;

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

    if ($myObject->myProp):
        $result[] = 'found';
    endif;
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

    if (get_async($value) === get_async(1000)):
        $result[] = get_async('third') . get_async(' and a concat');
    elseif (get_async($value) === get_async(1001)):
        $result[] = get_async('fourth');
    else:
        $result[] = get_async('fifth');
    endif;

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
            return this.createAsyncPresentValue(value);
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
if ($myAccessor):
    $result['accessor in condition'] = 'yes';
endif;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createAsyncPresentValue('my value');
            }
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'accessor in condition': 'yes'
        });
    });

    it('should support inline HTML inside the if statement body', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$condition = true;

if ($condition):
    $result[] = 'before html';
    ?>Some inline HTML content<?php
    $result[] = 'after html';
endif;

if (!$condition):
    ?>This should not appear<?php
else:
    $result[] = 'in else before html';
    ?>More inline HTML<?php
    $result[] = 'in else after html';
endif;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'before html',
            'after html',
            'in else before html',
            'in else after html'
        ]);
        expect(engine.getStdout().readAll()).to.equal('Some inline HTML contentMore inline HTML');
    });
});
