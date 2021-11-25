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

describe('PHP fatal error handling integration', function () {
    var doRun,
        outputLog;

    beforeEach(function () {
        outputLog = [];
        doRun = function (engine) {
            // Capture the standard streams, prefixing each write with its name
            // so that we can ensure that what is written to each of them is in the correct order
            // with respect to one another
            engine.getStdout().on('data', function (data) {
                outputLog.push('[stdout]' + data);
            });
            engine.getStderr().on('data', function (data) {
                outputLog.push('[stderr]' + data);
            });

            return engine.execute();
        };
    });

    it('should output the correct message to both stdout and stderr when display_errors=On and error_reporting=E_ALL in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'On');

myFunc();
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/php_module.php', php),
            engine = module();

        try {
            doRun(engine);
        } catch (error) {}

        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught Error: Call to undefined function myFunc() in /my/php_module.php:5
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 5

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught Error: Call to undefined function myFunc() in /my/php_module.php:5
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 5

EOS
*/;}) //jshint ignore:line
        ]);
    });

    it('should output the correct message to both stdout and stderr when display_errors=On and error_reporting=E_ALL from a closure in async mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'On');

call_async(function () {
    myFunc();
});
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/my/php_module.php', php),
            engine = module();
        engine.defineCoercingFunction('call_async', function (callback) {
            return this.createFutureValue(function (resolve, reject) {
                setImmediate(function () {
                    callback().then(resolve, reject);
                });
            });
        });

        return doRun(engine).then(
            function () {
                throw new Error('Expected promise to be rejected');
            },
            function () {
                expect(outputLog).to.deep.equal([
                    nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught Error: Call to undefined function myFunc() in /my/php_module.php:6
Stack trace:
#0 (JavaScript code)(unknown): {closure}()
#1 null(unknown): (JavaScript function)()
#2 /my/php_module.php(5): call_async(Object(Closure))
#3 {main}
  thrown in /my/php_module.php on line 6

EOS
*/;}), //jshint ignore:line
                    nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught Error: Call to undefined function myFunc() in /my/php_module.php:6
Stack trace:
#0 (JavaScript code)(unknown): {closure}()
#1 null(unknown): (JavaScript function)()
#2 /my/php_module.php(5): call_async(Object(Closure))
#3 {main}
  thrown in /my/php_module.php on line 6

EOS
*/;}), //jshint ignore:line
                    nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught Error: Call to undefined function myFunc() in /my/php_module.php on line 6

EOS
*/;}), //jshint ignore:line

                    // NB: Stdout should have a leading newline written out just before the message
                    nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught Error: Call to undefined function myFunc() in /my/php_module.php on line 6

EOS
*/;}) //jshint ignore:line
                ]);
            }
        );
    });

    it('should output the correct message to both stdout and stderr when display_errors=On and error_reporting=E_ALL after a pause in async mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'On');

wait_then_resume();

myFunc();
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/my/php_module.php', php),
            engine = module();
        engine.defineCoercingFunction('wait_then_resume', function () {
            return this.createFutureValue(function (resolve) {
                setImmediate(function () {
                    resolve();
                });
            });
        });

        return doRun(engine).then(
            function () {
                throw new Error('Expected promise to be rejected');
            },
            function () {
                expect(outputLog).to.deep.equal([
                    nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught Error: Call to undefined function myFunc() in /my/php_module.php:7
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 7

EOS
*/;}), //jshint ignore:line
                    nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught Error: Call to undefined function myFunc() in /my/php_module.php:7
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 7

EOS
*/;}) //jshint ignore:line
                ]);
            }
        );
    });

    it('should output the correct message only to stderr when display_errors=Off and error_reporting=E_ALL', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'Off');


myFunc();
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/your/php_module.php', php),
            engine = module();

        try {
            doRun(engine);
        } catch (error) {}

        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught Error: Call to undefined function myFunc() in /your/php_module.php:6
Stack trace:
#0 {main}
  thrown in /your/php_module.php on line 6

EOS
*/;}) //jshint ignore:line
        ]);
    });

    it('should output the correct message to both stdout and stderr when display_errors=On and error_reporting=E_ALL & ~E_NOTICE', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL & ~E_NOTICE);
ini_set('display_errors', 'On');

$anUndefinedVariable;

myFunc();
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/php_module.php', php),
            engine = module();

        try {
            doRun(engine);
        } catch (error) {}

        expect(outputLog).to.deep.equal([
            // The E_NOTICE errors should be sent to neither stdout nor stderr

            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught Error: Call to undefined function myFunc() in /my/php_module.php:7
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 7

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught Error: Call to undefined function myFunc() in /my/php_module.php:7
Stack trace:
#0 {main}
  thrown in /my/php_module.php on line 7

EOS
*/;}) //jshint ignore:line
        ]);
    });
});
