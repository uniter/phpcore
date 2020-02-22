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

describe('PHP "array" type integration', function () {
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

    it('should allow passing arrays for function parameters typed as "array"', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function mySummer(array $myData) {
    $sum = 0;

    foreach ($myData as $myItem) {
        $sum += $myItem;
    }

    return $sum;
}

$result['non-empty'] = mySummer([21, 100]);

$result['empty'] = mySummer([]);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(doRun(engine).getNative()).to.deep.equal({
            'non-empty': 121,
            'empty': 0
        });
    });

    it('should allow passing null for function parameters typed as "array" with default null', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myFunction(array $myArray = null) {
    return $myArray !== null ?
        'an array was given' :
        'it was omitted';
}

// Omit the $myArray argument
$result['omitted'] = myFunction();

$result['explicit null'] = myFunction(null);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(doRun(engine).getNative()).to.deep.equal({
            'omitted': 'it was omitted',
            'explicit null': 'it was omitted'
        });
    });

    it('should raise an error when an array-type parameter is given an invalid argument', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

function myFunction(array $myArray) {
    foreach ($myArray as $myItem) {
        print $myItem;
    }
}

// Strings are not valid arrays
myFunction('I_am_not_a_valid_array');
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/module.php', php),
            engine = module();

        expect(function () {
            doRun(engine);
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught TypeError: Argument 1 passed to myFunction() must be of the type array,' +
            ' string given, called in /path/to/module.php on line 12 and defined in /path/to/module.php:5' +
            // NB: Extraneous context info here is added by PHPFatalError (PHPError),
            //     but not output to stdout/stderr
            ' in /path/to/module.php on line 5'
        );
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught TypeError: Argument 1 passed to myFunction() must be of the type array, string given, called in /path/to/module.php on line 12 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(12): myFunction('I_am_not_a_vali...')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught TypeError: Argument 1 passed to myFunction() must be of the type array, string given, called in /path/to/module.php on line 12 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(12): myFunction('I_am_not_a_vali...')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
        ]);
    });
});
