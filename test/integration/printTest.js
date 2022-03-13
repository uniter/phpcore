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
    tools = require('./tools');

describe('PHP "print" expression integration', function () {
    it('should correctly handle a print of "hello" in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['print of immediate string literal'] = print 'hello';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            stdoutResult = '';

        engine.getStdout().on('data', function (data) {
            stdoutResult += data;
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'print of immediate string literal': 1
        });
        expect(stdoutResult).to.equal('hello');
    });

    it('should support fetching the operand from accessor returning future in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

print $myAccessor;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('my text to print');
                    });
                });
            }
        );

        await engine.execute();

        expect(engine.getStdout().readAll()).to.equal('my text to print');
    });
});
