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

describe('PHP logical "not" operator integration', function () {
    it('should support evaluation in async mode with pauses', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$truthy = new stdClass;
$falsy = 0;

$result = [];

$result['not truthy'] = !get_async($truthy);
$result['not falsy'] = !get_async($falsy);
$result['not-not truthy'] = !!get_async($truthy);

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

        expect((await engine.execute()).getNative()).to.deep.equal({
            'not truthy': false,
            'not falsy': true,
            'not-not truthy': true
        });
    });
});
