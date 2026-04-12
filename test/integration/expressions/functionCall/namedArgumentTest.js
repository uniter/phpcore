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
    tools = require('../../tools'),
    PHPFatalError = require('phpcommon').PHPFatalError;

describe('PHP function call named argument integration', function () {
    it('should support named arguments when calling PHP userland functions', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myFunc($first, $second, $third) {
    return "myFunc('$first', '$second', '$third')";
}

$result = [];

$result['named arguments only'] = myFunc(second: 42, first: 21, third: 100); // Note arguments in different order.
$result['both named and positional arguments'] = myFunc(21, third: 100, second: 42);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'named arguments only': 'myFunc(\'21\', \'42\', \'100\')',
            'both named and positional arguments': 'myFunc(\'21\', \'42\', \'100\')'
        });
    });

    it('should raise an Error when a named argument is given for an unknown parameter', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myFunc($first, $second, $third) {
    return "myFunc('$first', '$second', '$third')";
}

myFunc(first: 21, fourth: 101);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module/path.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Unknown named parameter $fourth in /some/module/path.php on line 7'
        );
        // Stdout (and stderr) should have the file/line combination in colon-separated format.
        expect(engine.getStdout().readAll()).to.equal(
            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught Error: Unknown named parameter $fourth in /some/module/path.php:7
Stack trace:
#0 {main}
  thrown in /some/module/path.php on line 7

EOS
*/;}) //jshint ignore:line
        );
        // Stderr should have the whole message prefixed with "PHP " and two spaces before "Uncaught ...".
        expect(engine.getStderr().readAll()).to.equal(
            // There should be no space between the "before" string printed and the error message.
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: Unknown named parameter $fourth in /some/module/path.php:7
Stack trace:
#0 {main}
  thrown in /some/module/path.php on line 7

EOS
*/;}) //jshint ignore:line
        );
    });
});
