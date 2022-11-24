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

describe('PHP "while" loop statement integration', function () {
    it('should be able to loop', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$i = 5;

while ($i > 2) {
    $result[] = '[' . $i . ']';

    $i--;
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            '[5]',
            '[4]',
            '[3]'
        ]);
    });

    it('should be able to nest loops in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$i = 5;

while ($i > 2) {
    $result[] = '[' . $i . ']';

    $j = 3;

    while ($j > 1) {
        $result[] = '[[' . $j . ']]';

        $j--;
    }

    $i--;
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            '[5]',
            '[[3]]',
            '[[2]]',
            '[4]',
            '[[3]]',
            '[[2]]',
            '[3]',
            '[[3]]',
            '[[2]]'
        ]);
    });

    it('should be able to loop in async mode with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$i = get_async(5);

while (get_async($i) > get_async(2)) {
    $result[] = get_async('[' . get_async($i) . ']');

    $i--;
}

return get_async($result);
EOS
*/;}),//jshint ignore:line
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

        expect((await engine.execute()).getNative()).to.deep.equal([
            '[5]',
            '[4]',
            '[3]'
        ]);
    });

    it('should be able to nest loops in async mode with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$i = get_async(5);

while (get_async($i) > get_async(2)) {
    $result[] = get_async('[' . get_async($i) . ']');

    $j = 3;

    while (get_async($j) > get_async(1)) {
        $result[] = get_async('[[' . get_async($j) . ']]');

        $j--;
    }

    $i = get_async($i) - 1;
}

return get_async($result);
EOS
*/;}),//jshint ignore:line
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

        expect((await engine.execute()).getNative()).to.deep.equal([
            '[5]',
            '[[3]]',
            '[[2]]',
            '[4]',
            '[[3]]',
            '[[2]]',
            '[3]',
            '[[3]]',
            '[[2]]'
        ]);
    });

    it('should support fetching the condition from accessor returning future in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

// Read the value from the accessor as the condition.
while ($myAccessor) {
    $result['accessor in condition'][] = 'yes';
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            results = ['first', 'second', false];
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(results.shift());
                    });
                });
            }
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'accessor in condition': ['yes', 'yes']
        });
    });
});
