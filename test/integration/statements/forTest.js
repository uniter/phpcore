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

describe('PHP "for" loop statement integration', function () {
    it('should be able to loop in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$i = 5;

for ($i = 5; $i > 2; $i--) {
    $result[] = '[' . $i . ']';
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            '[5]',
            '[4]',
            '[3]'
        ]);
    });

    it('should be able to loop in async mode with pauses', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

for ($i = get_async(5); get_async($i) > get_async(2); $i = get_async($i) - 1) {
    $result[] = get_async('[' . get_async($i) . ']');
}

return get_async($result);
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile(null, php),
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
                '[5]',
                '[4]',
                '[3]'
            ]);
        });
    });
});
