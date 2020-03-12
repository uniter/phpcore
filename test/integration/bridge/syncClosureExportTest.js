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

// -- Some padding to inflate line numbers a bit --

// Fetch from a separate file to check file paths are resolved correctly
$myClosure = require_once('/another/path/to/my_closure_provider.php');

return $myClosure;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            phpEngine = module({
                include: function (path, promise) {
                    if (path === '/another/path/to/my_closure_provider.php') {
                        promise.resolve(tools.syncTranspile(path, nowdoc(function () {/*<<<EOS
<?php

$yourClosure = function ($firstParam, $secondParam) {
    return [$firstParam, $secondParam];
};

return $yourClosure;
EOS
*/;}))); //jshint ignore:line
                    } else {
                        promise.reject();
                    }
                }
            }),
            unwrappedClosure = phpEngine.execute().getNative();

        expect(function () {
            unwrappedClosure(21);
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: Too few arguments to function {closure}(), ' +
            '1 passed in (JavaScript code) on line (unknown) and exactly 2 expected in /another/path/to/my_closure_provider.php on line 3'
        );
        expect(phpEngine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught ArgumentCountError: Too few arguments to function {closure}(), 1 passed in (JavaScript code) on line (unknown) and exactly 2 expected in /another/path/to/my_closure_provider.php:3
Stack trace:
#0 (JavaScript code)(unknown): {closure}(21)
#1 {main}
  thrown in /another/path/to/my_closure_provider.php on line 3

EOS
*/;}) //jshint ignore:line
        );
        // NB: Stdout should have a leading newline written out just before the message
        expect(phpEngine.getStdout().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught ArgumentCountError: Too few arguments to function {closure}(), 1 passed in (JavaScript code) on line (unknown) and exactly 2 expected in /another/path/to/my_closure_provider.php:3
Stack trace:
#0 (JavaScript code)(unknown): {closure}(21)
#1 {main}
  thrown in /another/path/to/my_closure_provider.php on line 3

EOS
*/;}) //jshint ignore:line
        );
    });
});
