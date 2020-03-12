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
    it('should extract the error details from a custom Exception thrown by a Closure and throw an appropriate JS Error', function (done) {
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

        engine.execute().then(function (result) {
            result.getNative()(9001).then(function () {
                done(new Error('Expected an error to be thrown, but none was'));
            }, function (error) {
                try {
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
                    done();
                } catch (error) {
                    done(error);
                }
            });
        }, done);
    });
});
