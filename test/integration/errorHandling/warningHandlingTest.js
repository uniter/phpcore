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

describe('PHP warning handling integration', function () {
    var doRun,
        outputLog;

    beforeEach(function () {
        outputLog = [];
        doRun = function (engine) {
            // Capture the standard streams, prefixing each write with its name
            // so that we can ensure that what is written to each of them is in the correct order
            // with respect to one another.
            engine.getStdout().on('data', function (data) {
                outputLog.push('[stdout]' + data);
            });
            engine.getStderr().on('data', function (data) {
                outputLog.push('[stderr]' + data);
            });

            return engine.execute();
        };
    });

    it('should output the correct data to stdout & stderr for an unsuppressed warning when display_errors=On and error_reporting=E_ALL', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'On');

print MY_UNDEFINED_CONSTANT;

print 'I should be printed too';
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/my/php_module.php', php),
            engine = module();

        await doRun(engine);

        expect(outputLog).to.deep.equal([
            '[stderr]PHP Warning:  Use of undefined constant MY_UNDEFINED_CONSTANT - assumed \'MY_UNDEFINED_CONSTANT\' ' +
            '(this will throw an Error in a future version of PHP) in /my/php_module.php on line 5\n',
            // NB: Stdout should have a leading newline written out just before the message.
            '[stdout]\nWarning: Use of undefined constant MY_UNDEFINED_CONSTANT - assumed \'MY_UNDEFINED_CONSTANT\' ' +
            '(this will throw an Error in a future version of PHP) in /my/php_module.php on line 5\n',

            '[stdout]MY_UNDEFINED_CONSTANT',
            // NB: There should be no newline between the two prints despite the undefined constant.
            '[stdout]I should be printed too'
        ]);
    });

    it('should output the correct data (with error message only to stderr) for an unsuppressed warning when display_errors=Off and error_reporting=E_ALL', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'Off');

print MY_UNDEFINED_CONSTANT;

print 'I should be printed too';
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/my/php_module.php', php),
            engine = module();

        await doRun(engine);

        expect(outputLog).to.deep.equal([
            '[stderr]PHP Warning:  Use of undefined constant MY_UNDEFINED_CONSTANT - assumed \'MY_UNDEFINED_CONSTANT\' ' +
            '(this will throw an Error in a future version of PHP) in /my/php_module.php on line 5\n',

            '[stdout]MY_UNDEFINED_CONSTANT',
            // NB: There should be no newline between the two prints despite the undefined constant.
            '[stdout]I should be printed too'
        ]);
    });
});
