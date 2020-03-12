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
    PHPFatalError = phpCommon.PHPFatalError,
    PHPParseError = phpCommon.PHPParseError;

describe('PHP synchronous eval(...) construct integration', function () {
    it('should allow evaluating expressions with access to the calling scope', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// Run inside a closure to check that its local scope is shared with the eval'd code
$finalResult = (function () {
    $myVar = 'out here';

    $result = [];

    // Check a simple scalar value can be returned
    $result['simple scalar'] = eval('return 21;');

    // Check that variables in the calling scope can be read from
    $result['read var in calling scope'] = eval('return "and " . $myVar;');

    // Check that NULL is returned when `return` is not used
    $result['missing return'] = eval('new stdClass;');

    // Check that variables in the calling scope may be written to
    eval('$myVar = "from in here";');
    $result['write to var in calling scope'] = $myVar;

    // Check that magic constants behave as expected
    $result['magic dir const'] = eval('return __DIR__;');
    $result['magic file const'] = eval('return __FILE__;');
    $result['magic line const'] = eval("\n\nreturn __LINE__;");
    $result['magic function const'] = eval('return __FUNCTION__;');
    $result['magic method const'] = eval('return __METHOD__;');

    return $result;
})();

return $finalResult;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/my/path/to/my_module.php', php),
            engine = module({
                eval: function (evalPHP, path, promise) {
                    promise.resolve(tools.syncTranspile(path, evalPHP));
                }
            });

        expect(engine.execute().getNative()).to.deep.equal({
            'simple scalar': 21,
            'read var in calling scope': 'and out here',
            'missing return': null,
            'write to var in calling scope': 'from in here',
            'magic dir const': '/my/path/to',
            'magic file const': '/my/path/to/my_module.php(24) : eval()\'d code',
            'magic line const': 3,
            'magic function const': '',
            'magic method const': ''
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly trap a parse error during eval of PHP code', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return eval('notvalid');
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module({
                eval: function (evalPHP, path, promise) {
                    promise.resolve(tools.syncTranspile(path, evalPHP));
                }
            });

        // NB:  The line number and file of the ParseError should be that of the included file,
        //      not the includer/parent
        // NB2: Unlike other errors, an uncaught ParseError is displayed as "PHP Parse error: ..."
        //      as below, _not_ as eg. "PHP Fatal error: Uncaught ParseError ..."
        expect(function () {
            engine.execute();
        }).to.throw(PHPParseError, 'PHP Parse error: syntax error, unexpected end of file in /path/to/my_module.php(3) : eval()\'d code on line 1');
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Parse error:  syntax error, unexpected end of file in /path/to/my_module.php(3) : eval()\'d code on line 1\n'
        );
        // NB: Stdout should have a leading newline written out just before the message
        expect(engine.getStdout().readAll()).to.equal(
            '\nParse error: syntax error, unexpected end of file in /path/to/my_module.php(3) : eval()\'d code on line 1\n'
        );
    });

    it('should correctly trap a compile-time fatal error during eval of PHP code', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return eval('
goto my_undefined_label;');
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_invalid_goto.php', php),
            engine = module({
                eval: function (evalPHP, path, promise) {
                    promise.resolve(tools.syncTranspile(path, evalPHP));
                }
            });

        // NB:  The line number and file of the error should be that of the included file,
        //      not the includer/parent
        // NB2: Unlike other errors, an uncaught compile-time fatal error is displayed as "PHP Fatal error: ..."
        //      as below, _not_ as eg. "PHP Fatal error: Uncaught Error ..."
        expect(function () {
            engine.execute();
        }).to.throw(PHPFatalError, 'PHP Fatal error: \'goto\' to undefined label \'my_undefined_label\' in /path/to/my_invalid_goto.php(3) : eval()\'d code on line 2');
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Fatal error:  \'goto\' to undefined label \'my_undefined_label\' in /path/to/my_invalid_goto.php(3) : eval()\'d code on line 2\n'
        );
        // NB: Stdout should have a leading newline written out just before the message
        expect(engine.getStdout().readAll()).to.equal(
            '\nFatal error: \'goto\' to undefined label \'my_undefined_label\' in /path/to/my_invalid_goto.php(3) : eval()\'d code on line 2\n'
        );
    });

    it('should correctly trap a runtime fatal error during eval of PHP code', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public static function myMethod() {
        myFunction();
    }
}

function myFunction() {
    return eval('
        my_undefined_func();
    ');
}

MyClass::myMethod();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_undefined_function_caller.php', php),
            engine = module({
                eval: function (evalPHP, path, promise) {
                    promise.resolve(tools.syncTranspile(path, evalPHP));
                }
            });

        // NB: The line number and file of the error should be that of the included file,
        //     not the includer/parent
        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Call to undefined function my_undefined_func() in /path/to/my_undefined_function_caller.php(10) : eval()\'d code on line 2'
        );
        // Stdout (and stderr) should have the file/line combination in colon-separated format
        expect(engine.getStdout().readAll()).to.equal(
            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught Error: Call to undefined function my_undefined_func() in /path/to/my_undefined_function_caller.php(10) : eval()'d code:2
Stack trace:
#0 /path/to/my_undefined_function_caller.php(10): eval()
#1 /path/to/my_undefined_function_caller.php(5): myFunction()
#2 /path/to/my_undefined_function_caller.php(15): MyClass::myMethod()
#3 {main}
  thrown in /path/to/my_undefined_function_caller.php(10) : eval()'d code on line 2

EOS
*/;}) //jshint ignore:line
        );
        // Stderr should have the whole message prefixed with "PHP " and two spaces before "Uncaught ..."
        expect(engine.getStderr().readAll()).to.equal(
            // There should be no space between the "before" string printed and the error message
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: Call to undefined function my_undefined_func() in /path/to/my_undefined_function_caller.php(10) : eval()'d code:2
Stack trace:
#0 /path/to/my_undefined_function_caller.php(10): eval()
#1 /path/to/my_undefined_function_caller.php(5): myFunction()
#2 /path/to/my_undefined_function_caller.php(15): MyClass::myMethod()
#3 {main}
  thrown in /path/to/my_undefined_function_caller.php(10) : eval()'d code on line 2

EOS
*/;}) //jshint ignore:line
        );
    });
});
