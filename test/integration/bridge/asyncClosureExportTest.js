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

describe('PHP JS<->PHP bridge closure export asynchronous mode integration', function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        return engine.execute().then(function (resultValue) {
            return resultValue.getNative()(9001).then(function () {
                throw new Error('Expected an error to be thrown, but none was');
            }, function (error) {
                expect(error).to.be.an.instanceOf(PHPFatalError);
                expect(error.message).to.equal(
                    'PHP Fatal error: Uncaught MyException: Oh no - 9001 (custom!) in /path/to/my_module.php on line 12'
                );
                expect(engine.getStderr().readAll()).to.equal(
                    nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught MyException: Oh no - 9001 (custom!) in /path/to/my_module.php:12
Stack trace:
#0 (JavaScript code)(unknown): {closure}(9001)
#1 {main}
  thrown in /path/to/my_module.php on line 12

EOS
*/;}) //jshint ignore:line
                );
                // NB: Stdout should have a leading newline written out just before the message
                expect(engine.getStdout().readAll()).to.equal(
                    nowdoc(function () {/*<<<EOS

Fatal error: Uncaught MyException: Oh no - 9001 (custom!) in /path/to/my_module.php:12
Stack trace:
#0 (JavaScript code)(unknown): {closure}(9001)
#1 {main}
  thrown in /path/to/my_module.php on line 12

EOS
*/;}) //jshint ignore:line
                );
            });
        });
    });

    it('should import a Closure that was previously exported to JS-land back as the original', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return (get_async(function (callable $myCallable, $a, $b) {
    return $myCallable($a, $b);
}))(function ($a, $b) {
    return $a * $b;
}, 21, 3);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.equal(63);
        });
    });
});
