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
                // Capture offsets of all nodes for line tracking.
                phpToAST: {captureAllOffsets: true},
                // Record line numbers for statements/expressions.
                phpToJS: {lineNumbers: true}
            }),
            engine = module();
        engine.defineNonCoercingFunction('get_my_object_class', function (objectValue) {
            return objectValue.getValue().getClassName();
        });

        expect((await doRun(engine)).getNative()).to.deep.equal([
            'TypeError: Unsupported operand types: array + stdClass @ /my/php_module.php:7',
            'TypeError: Unsupported operand types: array + int @ /my/php_module.php:20',
            'TypeError: Unsupported operand types: string / array @ /my/php_module.php:32'
        ]);
        expect(outputLog).to.deep.equal([]);
    });

    it('should raise a single warning when one operand is only leading-numeric', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

$result['addition'] = '21abc' * 2;

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/my/php_module.php', php, {
                // Capture offsets of all nodes for line tracking.
                phpToAST: {captureAllOffsets: true},
                // Record line numbers for statements/expressions.
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'addition': 42
        });
        expect(outputLog).to.deep.equal([
            '[stderr]PHP Warning:  A non-numeric value encountered in /my/php_module.php on line 6\n',
            '[stdout]\nWarning: A non-numeric value encountered in /my/php_module.php on line 6\n'
        ]);
    });

    it('should raise two warnings when both operands are only leading-numeric', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

$result['addition'] = '21abc' * '3xyz';

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/my/php_module.php', php, {
                // Capture offsets of all nodes for line tracking.
                phpToAST: {captureAllOffsets: true},
                // Record line numbers for statements/expressions.
                phpToJS: {lineNumbers: true}
            }),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'addition': 63
        });
        expect(outputLog).to.deep.equal([
            '[stderr]PHP Warning:  A non-numeric value encountered in /my/php_module.php on line 6\n',
            '[stdout]\nWarning: A non-numeric value encountered in /my/php_module.php on line 6\n',
            '[stderr]PHP Warning:  A non-numeric value encountered in /my/php_module.php on line 6\n',
            '[stdout]\nWarning: A non-numeric value encountered in /my/php_module.php on line 6\n'
        ]);
    });
});
