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
    phpCommon = require('phpcommon'),
    tools = require('../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP array access operator integration', function () {
    it('should be able to push onto both indexed and associative arrays', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result[] = 'first';
$result[] = 'second';
$result['three'] = 'third';
$result['four'] = 'fourth';
$result[] = 'fifth';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            0: 'first',
            1: 'second',
            three: 'third',
            four: 'fourth',
            2: 'fifth'
        });
    });

    it('should evaluate the expression before pushing the element onto the array', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$doPush = function () use (&$result) {
    $result[] = 21;
    return 22;
};
$result[] = $doPush();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            21,
            22
        ]);
    });

    it('should imply an array when assigning to an element of a variable with value null', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myArray = null;
$myArray['my_key'] = 'the value for element 21';
$result[] = $myArray;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            {
                my_key: 'the value for element 21'
            }
        ]);
    });

    it('should return the pushed value as the result of the push expression', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myArray = ['my' => 'my value'];
$result[] = ($myArray[] = 'the value for my pushed element');
$result[] = $myArray;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'the value for my pushed element',
            {
                'my': 'my value',
                0: 'the value for my pushed element'
            }
        ]);
    });

    it('should return the pushed reference\'s value as the result of the push expression', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];
$myValue = 21;

$myArray = ['my' => 'my value'];
$result[] =& $myValue;
$result[] = ($myArray[] =& $myValue); // $result[] should only have the value pushed, not the reference
$result[] = $myArray;

$myValue = 101;

$result[] = $myArray;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            101,
            21,
            {'my': 'my value', 0: 101},
            {'my': 'my value', 0: 101}
        ]);
    });

    it('should raise a fatal error on attempting to access a non-ArrayAccess object as an array', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {}

$object = new MyClass;

$dummy = $object['some key'];

EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot use object of type MyClass as array in my_module.php on line 7'
        );
    });
});
