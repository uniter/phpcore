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

describe('PHP variable-variable "$$..." integration', function () {
    it('should allow a variable to be referenced dynamically', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myVar = 21;
$myName = 'myVar';

$yourVar = 101;
$yourName = 'yourVar';

$result = [
    'with adjacent dollars' => $$myName,
    'bracketed' => ${$myName},
    'yourVar assignment' => $$yourName = 2000,
    'yourVar read-back' => $yourVar
];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with adjacent dollars': 21,
            'bracketed': 21,
            'yourVar assignment': 2000,
            'yourVar read-back': 2000
        });
    });

    it('should support fetching the variable name from accessor returning future in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myVar = 21;

$result = [
    'with adjacent dollars' => $$myAccessor,
    'bracketed' => ${$myAccessor}
];

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
                        resolve('myVar');
                    });
                });
            }
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with adjacent dollars': 21,
            'bracketed': 21
        });
    });
});
