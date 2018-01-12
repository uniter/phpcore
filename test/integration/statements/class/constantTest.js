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

describe('PHP class statement class constant integration', function () {
    it('should allow a forward reference from one constant to another above it', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    const FIRST = 101;

    const SECOND = self::FIRST;
}

$result = [];
$result[] = MyClass::FIRST;
$result[] = MyClass::SECOND;
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            101,
            101
        ]);
    });

    it('should allow a forward reference from one constant to another further down', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    const FIRST = self::SECOND;

    const SECOND = 21;
}

$result = [];
$result[] = MyClass::FIRST;
$result[] = MyClass::SECOND;
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            21
        ]);
    });
});
