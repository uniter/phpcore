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

describe('PHP ternary expression integration', function () {
    it('should support basic ternary operator expressions', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myTruthyVar = 1;

$result = [];
$result[] = 21 ? 10 : 12;
$result[] = 0 ? 'yep, truthy' : 'nope, falsy';
$result[] = $myTruthyVar ? 'yes' : 'no';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            10,
            'nope, falsy',
            'yes'
        ]);
    });

    it('should support shorthand ternary operator expressions', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = 21 ?: 12;
$result[] = 1 === 2 ?: 37;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            37
        ]);
    });

    it('should support nested ternary operator expressions', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = 0 ?: false ?: 30;
$result[] = 1 ?: 21 ?: 30;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            30,
            1
        ]);
    });

    it('should support pause/resume', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = get_async('first');

function testAsync($value)
{
    global $result;

    // Normal ternary
    $result[] = get_async($value) === get_async(1000) ?
        get_async('second') :
        get_async('other');

    // Shorthand ternary
    $result[] = get_async($value - 1000) ?: get_async('third');

    return get_async($value);
}

$result[] = get_async('fourth');
$result[] = testAsync(get_async(1000));

$result[] = get_async('fifth');
$result[] = testAsync(get_async(1001));

$result[] = get_async('sixth');

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

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal([
                'first',
                'fourth',
                'second',
                'third',
                1000,
                'fifth',
                'other',
                1,
                1001,
                'sixth'
            ]);
        });
    });
});
