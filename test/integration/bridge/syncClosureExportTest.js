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

describe('PHP JS<->PHP bridge closure export synchronous mode integration', function () {
    it('should extract the error details from a custom Exception thrown by a Closure and throw an appropriate JS Error', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyException extends Exception
{
    public function __construct($message)
    {
        parent::__construct($message . ' (custom!)');
    }
}

return function ($what) {
    throw new MyException('Oh no - ' . $what);
};
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            phpEngine = module(),
            myClosure = phpEngine.execute().getNative();

        expect(function () {
            myClosure(9001);
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught MyException: Oh no - 9001 (custom!) in my_module.php on line 12'
        );
    });

    it('should handle an unwrapped closure being called but missing some required arguments', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return function ($firstParam, $secondParam) {
    return [$firstParam, $secondParam];
};
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            phpEngine = module(),
            unwrappedClosure = phpEngine.execute().getNative();

        expect(function () {
            unwrappedClosure(21);
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: Too few arguments to function {closure}(), ' +
            '1 passed in (JavaScript code) on line (unknown) and exactly 2 expected in my_module.php on line 3'
        );
    });
});
