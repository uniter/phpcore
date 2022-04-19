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

describe('PHP "return" statement integration', function () {
    it('should return the expected result for a simple return statement in async mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 4;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        return module().execute().then(function (result) {
            expect(result.getNative()).to.equal(4);
        });
    });

    it('should correctly handle a return of pending future from accessor in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return $myAccessor;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('my result');
                    });
                });
            }
        );

        expect((await engine.execute()).getNative()).to.equal('my result');
    });

    it('should return the expected result for a simple return statement in psync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 4;
EOS
*/;}),//jshint ignore:line
            module = tools.psyncTranspile('/path/to/my_module.php', php);

        return module().execute().then(function (result) {
            expect(result.getNative()).to.equal(4);
        });
    });

    it('should return the expected result for a simple return statement in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return 4;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.equal(4);
    });

    it('should correctly handle a return of Future from accessor following pause in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
// Perform a pause initially.
$myAccessor = get_async('my result');

return $myAccessor;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            myResult;
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createAsyncPresentValue(value);
            };
        });
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createAsyncPresentValue(myResult);
            },
            function (newResult) {
                myResult = newResult;
            }
        );

        expect((await engine.execute()).getNative()).to.equal('my result');
    });

    it('should correctly handle a return of resolved future from accessor in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return $myAccessor;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createPresentValue('my result');
            }
        );

        expect(engine.execute().getNative()).to.equal('my result');
    });
});
