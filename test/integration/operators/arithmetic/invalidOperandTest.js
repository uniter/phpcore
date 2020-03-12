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
    tools = require('../../tools');

describe('PHP operator invalid operand integration', function () {
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

            return engine.execute();
        }.bind(this);
    });

    it('should output the correct data to stdout & stderr for invalid operator operands', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

try {
    $dummy = [21] + (new stdClass);
} catch (Throwable $throwable) {
    $result[] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

try {
    $array = [21];
    $dummy = $array + 21;
} catch (Throwable $throwable) {
    $result[] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

try {
    $dummy = 'abcd' / [];
} catch (Throwable $throwable) {
    $result[] = get_my_object_class($throwable) .
        ': ' .
        $throwable->getMessage() .
        ' @ ' .
        $throwable->getFile() .
        ':' .
        $throwable->getLine();
}

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/my/php_module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllOffsets: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();
        engine.defineNonCoercingFunction('get_my_object_class', function (objectValue) {
            return objectValue.getValue().getClassName();
        });

        expect(this.doRun(engine).getNative()).to.deep.equal([
            'Error: Unsupported operand types @ /my/php_module.php:7',
            'Error: Unsupported operand types @ /my/php_module.php:20',
            'Error: Unsupported operand types @ /my/php_module.php:32'
        ]);
        expect(this.outputLog).to.deep.equal([
            '[stderr]PHP Notice:  Object of class stdClass could not be converted to number in /my/php_module.php on line 7\n',
            // NB: Stdout should have a leading newline written out just before the message
            '[stdout]\nNotice: Object of class stdClass could not be converted to number in /my/php_module.php on line 7\n'
        ]);
    });
});
