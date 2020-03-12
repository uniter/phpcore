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

describe('Warning handling integration', function () {
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

    it('should output the correct data to stdout & stderr for an unsuppressed warning when display_errors=On and error_reporting=E_ALL', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'On');

print MY_UNDEFINED_CONSTANT;

print 'I should be printed too';
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/php_module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllOffsets: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        this.doRun(engine);

        expect(this.outputLog).to.deep.equal([
            '[stderr]PHP Warning:  Use of undefined constant MY_UNDEFINED_CONSTANT - assumed \'MY_UNDEFINED_CONSTANT\' ' +
            '(this will throw an Error in a future version of PHP) in /my/php_module.php on line 5\n',
            // NB: Stdout should have a leading newline written out just before the message
            '[stdout]\nWarning: Use of undefined constant MY_UNDEFINED_CONSTANT - assumed \'MY_UNDEFINED_CONSTANT\' ' +
            '(this will throw an Error in a future version of PHP) in /my/php_module.php on line 5\n',

            '[stdout]MY_UNDEFINED_CONSTANT',
            // NB: There should be no newline between the two prints despite the undefined constant
            '[stdout]I should be printed too'
        ]);
    });

    it('should output the correct data (with error message only to stderr) for an unsuppressed warning when display_errors=Off and error_reporting=E_ALL', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 'Off');

print MY_UNDEFINED_CONSTANT;

print 'I should be printed too';
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/php_module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllOffsets: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        this.doRun(engine);

        expect(this.outputLog).to.deep.equal([
            '[stderr]PHP Warning:  Use of undefined constant MY_UNDEFINED_CONSTANT - assumed \'MY_UNDEFINED_CONSTANT\' ' +
            '(this will throw an Error in a future version of PHP) in /my/php_module.php on line 5\n',

            '[stdout]MY_UNDEFINED_CONSTANT',
            // NB: There should be no newline between the two prints despite the undefined constant
            '[stdout]I should be printed too'
        ]);
    });
});
