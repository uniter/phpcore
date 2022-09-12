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
    it('should correctly handle calling a function dynamically', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with variable containing name': 22,
            'with indirect variable name': 32
        });
    });

    it('should treat function names as case-insensitive', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.equal(32);
    });

    it('should allow a variable containing an array to be passed by-reference', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
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

    it('should correctly handle passing an undefined variable as by-value argument that is then re-assigned within a later argument', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

function myFunc($arg1, $arg2) {
    return $arg1 + $arg2;
}

$yourVar = 100;
$myCallable = 'myFunc';

$result['value assignment within argument'] = $myCallable($myVar, ${($myVar = 32) && false ?: 'myVar'});
$result['reference assignment within argument'] = $myCallable($myVar, ${($myVar =& $yourVar) && false ?: 'myVar'});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            // Value should be resolved (resulting in a notice as it is undefined)
            // at the point the argument is passed.
            'value assignment within argument': 32,

            // First argument should use the original value
            // and not the reference assigned within the second argument.
            'reference assignment within argument': 132
        });
        expect(engine.getStderr().readAll()).to.equal('PHP Notice:  Undefined variable: myVar in /path/to/my_module.php on line 13\n');
        expect(engine.getStdout().readAll()).to.equal('\nNotice: Undefined variable: myVar in /path/to/my_module.php on line 13\n');
    });
});
