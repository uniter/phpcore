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

describe('PHP list(...) construct integration', function () {
    it('should correctly handle assigning an array to a list with elements skipped', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$array = [21, 'hello', 22, 'world'];

list(, $val2, , $val4) = $array;

return [$val2, $val4];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'hello',
            'world'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle assigning an array with elements using accessor references', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$array = ['initial'];
$array[] =& $firstReadAccessor;
$array[] =& $secondReadAccessor;

list($val1, $val2, $writeAccessor) = $array;

return [$val1, $val2, $writeAccessor];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module(),
            myValue = null;
        engine.defineGlobalAccessor('firstReadAccessor', function () {
            return this.createAsyncPresentValue('first');
        });
        engine.defineGlobalAccessor('secondReadAccessor', function () {
            return this.createAsyncPresentValue('second');
        });
        engine.defineGlobalAccessor('writeAccessor', function () {
            return this.createAsyncPresentValue(myValue);
        }, function (newValue) {
            // Defer the assignment to ensure futures are handled.
            return this.createAsyncMacrotaskFutureValue(function (resolve) {
                myValue = newValue;
                resolve(newValue);
            });
        });

        expect((await engine.execute()).getNative()).to.deep.equal([
            'initial',
            'first',
            'second'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle assigning an integer to a list by nulling the target variables', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$val1 = 1;
$val2 = 2;

list(, $val1, , $val2) = 21;

return [$val1, $val2];
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            null,
            null
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
