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

describe('PHP "try" statement integration', function () {
    it('should allow a thrown exception to be caught', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

class MyException extends Exception {}

try {
    $result[] = 1;
    throw new MyException('Oh no');
    $result[] = 2;
} catch (MyException $ex1) {
    $result[] = 3;
} catch (NotMyException $ex2) {
    $result[] = 4;
} finally {
    $result[] = 5;
}
$result[] = 6;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([1, 3, 5, 6]);
    });
});
