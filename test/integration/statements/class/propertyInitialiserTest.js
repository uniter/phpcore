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

describe('PHP class statement property initialiser integration', function () {
    it('should give each instance a separate array object when initialised with one', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public $myProp = [21];

    public function addOne() {
        $this->myProp[0]++;
    }
}

$firstObject = new MyClass;
$firstObject->addOne();

$secondObject = new MyClass;

$result = [];
$result[] = $firstObject->myProp[0];
$result[] = $secondObject->myProp[0];
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            22,
            21
        ]);
    });
});
