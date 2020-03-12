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

describe('PHP JS<->PHP bridge object export asynchronous mode integration', function () {
    it('should return an object with instance methods returning promises', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    private $tools;

    public function __construct($tools)
    {
        $this->tools = $tools;
    }

    public function addAndGetWhat($toAdd)
    {
        return $this->tools->giveMeAsync(2) + $toAdd;
    }
}

$myObject = new MyClass($tools);

return $myObject;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile(null, php),
            phpEngine = module();

        phpEngine.expose({
            giveMeAsync: function (what) {
                var pause = phpEngine.createPause();

                setTimeout(function () {
                    pause.resume(what);
                });

                pause.now();
            }
        }, 'tools');

        return phpEngine.execute().then(function (valueObject) {
            var myObject = valueObject.getNative();

            return myObject.addAndGetWhat(20).then(function (resultValue) {
                expect(resultValue).to.equal(22);
            });
        });
    });

    it('should extract the error details from a custom Exception thrown by an instance method and throw an appropriate JS Error', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php

class YourException extends Exception
{
    public function __construct($message)
    {
        parent::__construct($message . ' (custom!)');
    }
}

class MyClass
{
    public function throwIt($what)
    {
        throw new YourException('Oh no - ' . $what);
    }
}

return new MyClass();
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/a_module.php', php),
            engine = module();

        engine.execute().then(function (result) {
            result.getNative().throwIt(9001).then(function () {
                done(new Error('Expected an error to be thrown, but none was'));
            }, function (error) {
                try {
                    expect(error).to.be.an.instanceOf(PHPFatalError);
                    expect(error.message).to.equal(
                        'PHP Fatal error: Uncaught YourException: Oh no - 9001 (custom!) in /path/to/a_module.php on line 15'
                    );
                    expect(engine.getStderr().readAll()).to.equal(
                        nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught YourException: Oh no - 9001 (custom!) in /path/to/a_module.php:15
Stack trace:
#0 (JavaScript code)(unknown): MyClass->throwIt(9001)
#1 {main}
  thrown in /path/to/a_module.php on line 15

EOS
*/;}) //jshint ignore:line
                    );
                    // NB: Stdout should have a leading newline written out just before the message
                    expect(engine.getStdout().readAll()).to.equal(
                        nowdoc(function () {/*<<<EOS

Fatal error: Uncaught YourException: Oh no - 9001 (custom!) in /path/to/a_module.php:15
Stack trace:
#0 (JavaScript code)(unknown): MyClass->throwIt(9001)
#1 {main}
  thrown in /path/to/a_module.php on line 15

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
