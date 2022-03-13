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

describe('PHP variable function call integration', function () {
    it('should correctly handle calling a function dynamically', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction($arg)
{
    return $arg + 2;
}

$myFunctionName = 'myFunction';
$myFunctionNameVar = 'myFunctionName';

return [
    'with variable containing name' => $myFunctionName(20),
    'with indirect variable name' => ${$myFunctionNameVar}(30)
];
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.deep.equal({
            'with variable containing name': 22,
            'with indirect variable name': 32
        });
    });

    it('should treat function names as case-insensitive', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction($arg)
{
    return $arg + 2;
}

$myFunctionName = 'mYFuNcTiON';

return $myFunctionName(30);
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.equal(32);
    });

    it('should allow a variable containing an array to be passed by-reference', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction(array &$theArray)
{
    $theArray[] = 'added';
}

$myFunctionName = 'myFunction';
$myArray = [21, 101];
$myFunctionName($myArray);

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            101,
            'added'
        ]);
    });

    it('should support fetching the function name from accessor returning future in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction($arg)
{
    return $arg + 2;
}

$myFunctionNameVar = 'myAccessor';

return [
    'with variable containing name' => $myAccessor(20),
    'with indirect variable name' => ${$myFunctionNameVar}(30)
];
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('myFunction');
                    });
                });
            }
        );

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with variable containing name': 22,
            'with indirect variable name': 32
        });
    });
});
