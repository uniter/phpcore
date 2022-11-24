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

    it('should output the correct data to stdout & stderr for invalid operator operands', async function () {
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
            module = tools.asyncTranspile('/my/php_module.php', php, {
                // Capture offsets of all nodes for line tracking
                phpToAST: {captureAllOffsets: true},
                // Record line numbers for statements/expressions
                phpToJS: {lineNumbers: true}
            }),
            engine = module();
        engine.defineNonCoercingFunction('get_my_object_class', function (objectValue) {
            return objectValue.getValue().getClassName();
        });

        expect((await doRun(engine)).getNative()).to.deep.equal([
            'Error: Unsupported operand types @ /my/php_module.php:7',
            'Error: Unsupported operand types @ /my/php_module.php:20',
            'Error: Unsupported operand types @ /my/php_module.php:32'
        ]);
        expect(outputLog).to.deep.equal([
            '[stderr]PHP Notice:  Object of class stdClass could not be converted to int in /my/php_module.php on line 7\n',
            // NB: Stdout should have a leading newline written out just before the message
            '[stdout]\nNotice: Object of class stdClass could not be converted to int in /my/php_module.php on line 7\n'
        ]);
    });
});
