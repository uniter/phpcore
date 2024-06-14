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

describe('PHP Engine API .defineOverloadedFunction() integration', function () {
    it('should support overloading builtin functions based on parameter count', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['with no arguments'] = myOverloadedFunc();
$result['with one argument'] = myOverloadedFunc(21);
$result['with two arguments'] = myOverloadedFunc('hello', 'world');

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();
        engine.defineOverloadedFunction('myOverloadedFunc', function (internals) {
            internals.disableAutoCoercion();

            internals.defineVariant(': string', function () {
                return 'No arguments for me';
            });
            internals.defineVariant('int $number : string', function (numberValue) {
                return 'My number was: ' + numberValue.getNative();
            });
            internals.defineVariant('string $first, string $second : string', function (firstValue, secondValue) {
                return 'I said ' + firstValue.getNative() + ', ' + secondValue.getNative() + '!';
            });
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with no arguments': 'No arguments for me',
            'with one argument': 'My number was: 21',
            'with two arguments': 'I said hello, world!'
        });
        expect(engine.getStdout().readAll()).to.equal('');
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
