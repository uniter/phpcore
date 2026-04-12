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
    tools = require('../../../../../tools'),
    PHPFatalError = require('phpcommon').PHPFatalError;

describe('PHP builtin FFI function non-coercion named argument integration', function () {
    it('should support named arguments', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['named arguments only'] = my_func(second: 42, first: 21, third: 100); // Note arguments in different order.
$result['both named and positional arguments'] = my_func(21, third: 100, second: 42);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineNonCoercingFunction(
            'my_func',
            function (firstValue, secondValue, thirdValue) {
                return this.valueFactory.createString(
                    'my_func(' +
                    firstValue.getNative() + ', ' +
                    secondValue.getNative() + ', ' +
                    thirdValue.getNative() +
                    ')'
                );
            },
            'int $first, int $second, int $third : string'
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'named arguments only': 'my_func(21, 42, 100)',
            'both named and positional arguments': 'my_func(21, 42, 100)'
        });
    });

    it('should raise an Error when a named argument is given for an unknown parameter', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

my_func(first: 21, fourth: 101);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();
        engine.defineNonCoercingFunction(
            'my_func',
            function (firstValue, secondValue, thirdValue) {
                return this.valueFactory.createString(
                    'my_func(' +
                    firstValue.getNative() + ', ' +
                    secondValue.getNative() + ', ' +
                    thirdValue.getNative() +
                    ')'
                );
            },
            'int $first, int $second, int $third : string'
        );

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Unknown named parameter $fourth in /some/module/path.php on line 3'
        );
        // Stdout (and stderr) should have the file/line combination in colon-separated format.
        expect(engine.getStdout().readAll()).to.equal(
            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught Error: Unknown named parameter $fourth in /some/module/path.php:3
Stack trace:
#0 {main}
  thrown in /some/module/path.php on line 3

EOS
*/;}) //jshint ignore:line
        );
        // Stderr should have the whole message prefixed with "PHP " and two spaces before "Uncaught ...".
        expect(engine.getStderr().readAll()).to.equal(
            // There should be no space between the "before" string printed and the error message.
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: Unknown named parameter $fourth in /some/module/path.php:3
Stack trace:
#0 {main}
  thrown in /some/module/path.php on line 3

EOS
*/;}) //jshint ignore:line
        );
    });
});
