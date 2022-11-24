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

describe('PHP array literal integration', function () {
    it('should allow indexed elements to be defined with a reference to a variable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myVar = 4;

$myArray = [21, $myVar, &$myVar];
$myVar = 27;

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        expect((await module().execute()).getNative()).to.deep.equal([
            21,
            4,
            27
        ]);
    });

    it('should allow indexed elements to be defined using an accessor for value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myArray = [21, $myAccessor, 101];

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAccessor',
            function () {
                return this.createAsyncPresentValue('from accessor');
            }
        );

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            'from accessor',
            101
        ]);
    });

    it('should allow associative elements to be defined where key is a variable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myKeyName = 'myDynamicKey';

$myArray = [21, $myKeyName => 'my value', 100];

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        expect((await module().execute()).getNative()).to.deep.equal({
            0: 21,
            'myDynamicKey': 'my value',
            1: 100
        });
    });

    it('should allow associative elements to be defined where key is a variable and value is a reference to a variable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myVar = 4;
$myKeyName = 'myRef';

$myArray = [21, $myVar, $myKeyName => &$myVar];
$myVar = 27;

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        expect((await module().execute()).getNative()).to.deep.equal({
            0: 21,
            1: 4,
            'myRef': 27
        });
    });

    it('should allow elements to be defined with the value of a property', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass {
    public $myProp = 101;
}

$myObject = new MyClass;
$myArray = [21, $myObject->myProp];

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        expect((await module().execute()).getNative()).to.deep.equal([
            21,
            101
        ]);
    });

    it('should allow elements to be defined with the key "length"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myArray = ['length' => 21, 101];

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php);

        expect((await module().execute()).getNative()).to.deep.equal({
            length: 21,
            0: 101
        });
    });

    it('should correctly handle specifying a variable as element that is then re-assigned within a later element', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$yourVar = 100;

$result['value assignment within element'] = [${($myVar = 21) && false ?: 'myVar'}, ${($myVar = 32) && false ?: 'myVar'}];
$result['reference assignment within element'] = [${($myVar = 21) && false ?: 'myVar'}, ${($myVar =& $yourVar) && false ?: 'myVar'}];

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            // Value should be resolved at the point the element is passed.
            'value assignment within element': [21, 32],

            // First element should use the original value
            // and not the reference assigned within the second element.
            'reference assignment within element': [21, 100]
        });
    });
});
