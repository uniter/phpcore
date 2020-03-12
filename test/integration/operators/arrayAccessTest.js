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
    it('should be able to push onto both indexed and associative arrays', function () {
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
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            0: 'first',
            1: 'second',
            three: 'third',
            four: 'fourth',
            2: 'fifth'
        });
    });

    it('should evaluate the expression before pushing the element onto the array', function () {
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
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            22
        ]);
    });

    it('should imply an array when assigning to an element of a variable with value null', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myArray = null;
$myArray['my_key'] = 'the value for element 21';
$result[] = $myArray;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            {
                my_key: 'the value for element 21'
            }
        ]);
    });

    it('should raise a fatal error on attempting to access a non-ArrayAccess object as an array', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {}

$object = new MyClass;

$dummy = $object['some key'];

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Cannot use object of type MyClass as array in my_module.php on line 7'
        );
    });
});
