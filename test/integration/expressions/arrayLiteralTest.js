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
    it('should allow elements to be defined with a reference to a variable', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myVar = 4;

$myArray = [21, $myVar, &$myVar];
$myVar = 27;

return $myArray;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            4,
            27
        ]);
    });

    it('should allow elements to be defined with the value of a property', function () {
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
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            101
        ]);
    });
});
