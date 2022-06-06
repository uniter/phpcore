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

describe('PHP "do..while" loop statement integration', function () {
    it('should be able to loop in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$i = 5;

do {
    $result[] = '[' . $i . ']';

    $i--;
} while ($i > 2);

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.deep.equal([
            '[5]',
            '[4]',
            '[3]'
        ]);
    });

    it('should be able to loop in async mode with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$i = get_async(5);

do {
    $result[] = get_async('[' . get_async($i) . ']');

    $i--;
} while (get_async($i) > get_async(2));

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
});
