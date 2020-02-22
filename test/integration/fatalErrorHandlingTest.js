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
    tools = require('./tools');

describe('Fatal error handling integration', function () {
    beforeEach(function () {
        this.outputLog = [];
        this.doRun = function (engine) {
            // Capture the standard streams, prefixing each write with its name
            // so that we can ensure that what is written to each of them is in the correct order
            // with respect to one another
            engine.getStdout().on('data', function (data) {
                this.outputLog.push('[stdout]' + data);
            }.bind(this));
            engine.getStderr().on('data', function (data) {
                this.outputLog.push('[stderr]' + data);
            }.bind(this));

            engine.execute();
        }.bind(this);
    });

    it('should output the correct message to both stdout and stderr when display_errors=On and error_reporting=E_ALL', function () {
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
            this.doRun(engine);
        } catch (error) {}

        expect(this.outputLog).to.deep.equal([
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
            this.doRun(engine);
        } catch (error) {}

        expect(this.outputLog).to.deep.equal([
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
            this.doRun(engine);
        } catch (error) {}

        expect(this.outputLog).to.deep.equal([
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
