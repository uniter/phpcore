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

describe('PHP "echo" statement integration', function () {
    it('should be able to echo the value of a variable or immediate string literal', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myVar = 'hello ';

echo $myVar;
echo 'world';
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal('hello world');
    });

    it('should support fetching the operand from accessor returning future in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

echo $myAccessor;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('my text to echo');
                    });
                });
            }
        );

        await engine.execute();

        expect(engine.getStdout().readAll()).to.equal('my text to echo');
    });
});
