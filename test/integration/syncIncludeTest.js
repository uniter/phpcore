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
    phpCommon = require('phpcommon'),
    nowdoc = require('nowdoc'),
    tools = require('./tools'),
    PHPFatalError = phpCommon.PHPFatalError,
    PHPParseError = phpCommon.PHPParseError;

describe('PHP synchronous "include" statement integration', function () {
    it('should correctly handle an include where the loader returns a compiled wrapper function', function () {
        var parentPHP = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            parentModule = tools.syncTranspile(null, parentPHP),
            childPHP = nowdoc(function () {/*<<<EOS
<?php
print 'inside';
EOS
*/;}), //jshint ignore:line
            childModule = tools.syncTranspile(null, childPHP),
            options = {
                include: function (path, promise) {
                    promise.resolve(childModule);
                }
            },
            engine = parentModule(options);

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal('before inside after');
    });

    it('should correctly handle magic constants used from inside the included file', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunction () {
    return include '/sub/path/to/magic_constants.php';
}
return myFunction();
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                path: '/path/to/my/caller.php',
                include: function (path, promise) {
                    var childPHP = nowdoc(function () {/*<<<EOS
<?php

return [
    'magic file const' => __FILE__,
    'magic dir const' => __DIR__,
    'magic line const' => __LINE__,
    'magic function const' => __FUNCTION__,
    'magic method const' => __METHOD__
];
EOS
*/;}); //jshint ignore:line
                    promise.resolve(tools.syncTranspile(path, childPHP));
                }
            };

        expect(module(options).execute().getNative()).to.deep.equal({
            'magic file const': '/sub/path/to/magic_constants.php',
            'magic dir const': '/sub/path/to',
            'magic line const': 6,
            'magic function const': '', // Included module should not be aware of the including function
            'magic method const': ''    // Included module should not be aware of the including method
        });
    });

    it('should normalise the called file\'s path', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
// Deliberately use the current-dir and parent-dir path symbols to check for normalisation
$message = include 'my/./path/to/../abc.php';

return $message;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                path: 'my/caller.php',
                include: function (path, promise) {
                    promise.resolve(tools.syncTranspile(path, '<?php return "Hello from " . __FILE__ . "!";'));
                }
            };

        expect(module(options).execute().getNative()).to.equal(
            // Ensure the symbols are resolved here
            'Hello from my/path/abc.php!'
        );
    });

    it('should pass the calling file\'s path to the transport', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$message = include 'abc.php';
return $message;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath) {
                    promise.resolve(tools.syncTranspile(path, '<?php return "Hello from ' + callerPath + '!";'));
                }
            };

        expect(module(options).execute().getNative()).to.equal('Hello from my/caller.php!');
    });

    it('should correctly handle a rejection', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('a_module.php', php),
            options = {
                include: function (path, promise) {
                    promise.reject();
                }
            },
            engine = module(options);

            expect(engine.execute().getNative()).to.equal(false);
            expect(engine.getStderr().readAll()).to.equal(nowdoc(function () {/*<<<EOS
PHP Warning:  include(abc.php): failed to open stream: No such file or directory in a_module.php on line 2
PHP Warning:  include(): Failed opening 'abc.php' for inclusion in a_module.php on line 2

EOS
*/;})); //jshint ignore:line
    });

    it('should correctly trap a parse error in included file', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$num = include 'abc.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('my_parent.php', php),
            options = {
                include: function (path, promise) {
                    try {
                        promise.resolve(tools.syncTranspile(path, '<?php abab'));
                    } catch (error) {
                        promise.reject(error);
                    }
                }
            },
            engine = module(options);

        // NB:  The line number and file of the ParseError should be that of the included file,
        //      not the includer/parent
        // NB2: Unlike other errors, an uncaught ParseError is displayed as "PHP Parse error: ..."
        //      as below, _not_ as eg. "PHP Fatal error: Uncaught ParseError ..."
        expect(function () {
            engine.execute();
        }).to.throw(PHPParseError, 'PHP Parse error: syntax error, unexpected end of file in abc.php on line 1');
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Parse error:  syntax error, unexpected end of file in abc.php on line 1\n'
        );
        // NB: Stdout should have a leading newline written out just before the message
        expect(engine.getStdout().readAll()).to.equal(
            '\nParse error: syntax error, unexpected end of file in abc.php on line 1\n'
        );
    });

    it('should correctly trap a compile-time fatal error in included file', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// Some padding to increase the line number of the caller

$num = include 'my_invalid_goto.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('my_parent.php', php),
            options = {
                include: function (path, promise) {
                    // Goto to undefined label in included file should raise a fatal error
                    try {
                        promise.resolve(tools.syncTranspile(path, '<?php\n\ngoto my_undefined_label;'));
                    } catch (error) {
                        promise.reject(error);
                    }
                }
            },
            engine = module(options);

        // NB:  The line number and file of the error should be that of the included file,
        //      not the includer/parent
        // NB2: Unlike other errors, an uncaught compile-time fatal error is displayed as "PHP Fatal error: ..."
        //      as below, _not_ as eg. "PHP Fatal error: Uncaught Error ..."
        expect(function () {
            engine.execute();
        }).to.throw(PHPFatalError, 'PHP Fatal error: \'goto\' to undefined label \'my_undefined_label\' in my_invalid_goto.php on line 3');
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Fatal error:  \'goto\' to undefined label \'my_undefined_label\' in my_invalid_goto.php on line 3\n'
        );
        // NB: Stdout should have a leading newline written out just before the message
        expect(engine.getStdout().readAll()).to.equal(
            '\nFatal error: \'goto\' to undefined label \'my_undefined_label\' in my_invalid_goto.php on line 3\n'
        );
    });

    it('should correctly trap a runtime error in included file that is uncaught and becomes fatal', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// Some padding to increase the line number of the caller

$num = include '/some/path/my_undefined_function_caller.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('my_parent.php', php),
            options = {
                include: function (path, promise) {
                    try {
                        promise.resolve(tools.syncTranspile(path, '<?php\n\nmy_undefined_func();'));
                    } catch (error) {
                        promise.reject(error);
                    }
                }
            },
            engine = module(options);

        // NB: The line number and file of the error should be that of the included file,
        //     not the includer/parent
        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Call to undefined function my_undefined_func() in /some/path/my_undefined_function_caller.php on line 3'
        );
        // Stdout (and stderr) should have the file/line combination in colon-separated format
        expect(engine.getStdout().readAll()).to.equal(
            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught Error: Call to undefined function my_undefined_func() in /some/path/my_undefined_function_caller.php:3
Stack trace:
#0 my_parent.php(5): include()
#1 {main}
  thrown in /some/path/my_undefined_function_caller.php on line 3

EOS
*/;}) //jshint ignore:line
        );
        // Stderr should have the whole message prefixed with "PHP " and two spaces before "Uncaught ..."
        expect(engine.getStderr().readAll()).to.equal(
            // There should be no space between the "before" string printed and the error message
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: Call to undefined function my_undefined_func() in /some/path/my_undefined_function_caller.php:3
Stack trace:
#0 my_parent.php(5): include()
#1 {main}
  thrown in /some/path/my_undefined_function_caller.php on line 3

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should correctly trap a runtime error in function called by included file that is uncaught and becomes fatal', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// Some padding to increase the line number of the caller

$num = include '/some/path/my_undefined_function_caller.php';
return $num;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('my_parent.php', php),
            options = {
                include: function (path, promise) {
                    try {
                        promise.resolve(tools.syncTranspile(path,
                            nowdoc(function () {/*<<<EOS
<?php

function subFunction() {
    my_undefined_func();
}

subFunction();
EOS
*/;}) //jshint ignore:line
                        ));
                    } catch (error) {
                        promise.reject(error);
                    }
                }
            },
            engine = module(options);

        // NB: The line number and file of the error should be that of the included file,
        //     not the includer/parent
        expect(function () {
            engine.execute();
        }).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Call to undefined function my_undefined_func() in /some/path/my_undefined_function_caller.php on line 4'
        );
        // Stdout (and stderr) should have the file/line combination in colon-separated format
        expect(engine.getStdout().readAll()).to.equal(
            // NB: Stdout should have a leading newline written out just before the message
            nowdoc(function () {/*<<<EOS

Fatal error: Uncaught Error: Call to undefined function my_undefined_func() in /some/path/my_undefined_function_caller.php:4
Stack trace:
#0 /some/path/my_undefined_function_caller.php(7): subFunction()
#1 my_parent.php(5): include()
#2 {main}
  thrown in /some/path/my_undefined_function_caller.php on line 4

EOS
*/;}) //jshint ignore:line
        );
        // Stderr should have the whole message prefixed with "PHP " and two spaces before "Uncaught ..."
        expect(engine.getStderr().readAll()).to.equal(
            // There should be no space between the "before" string printed and the error message
            nowdoc(function () {/*<<<EOS
PHP Fatal error:  Uncaught Error: Call to undefined function my_undefined_func() in /some/path/my_undefined_function_caller.php:4
Stack trace:
#0 /some/path/my_undefined_function_caller.php(7): subFunction()
#1 my_parent.php(5): include()
#2 {main}
  thrown in /some/path/my_undefined_function_caller.php on line 4

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should correctly trap when no include transport is configured', function () {
        var module = tools.syncTranspile(null, '<?php include "no_transport.php";');

        expect(function () {
            module().execute();
        }).to.throw('include(no_transport.php) :: No "include" transport option is available for loading the module.');
    });

    it('should use the same stdout stream for included modules', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    promise.resolve(tools.syncTranspile(path, '<?php print 21 + 2;'));
                }
            },
            engine = module(options);

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal('before 23 after');
    });

    it('should support include transports that return a return value for the module', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$num = include 'abc.php';
return $num + 1;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath, valueFactory) {
                    promise.resolve(valueFactory.createInteger(321));
                }
            };

        expect(module(options).execute().getNative()).to.equal(322);
    });

    it('should support including the same file multiple times', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = include 'abc.php';
$result[] = include 'abc.php';
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            results = ['first', 'second'],
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath, valueFactory) {
                    promise.resolve(valueFactory.createString(results.shift()));
                }
            };

        expect(module(options).execute().getNative()).to.deep.equal([
            'first',
            'second'
        ]);
    });

    it('should evaluate an included module in the scope the `include` statement is in', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function myFunc() {
    $myVar = 21;

    return include 'my_module.php';
}

return myFunc();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    var php = nowdoc(function () {/*<<<EOS
<?php
return ($myVar * 2) . ' from ${path}';
EOS
*/;}, {path: path}); //jshint ignore:line
                    promise.resolve(tools.syncTranspile(path, php));
                }
            },
            engine = module(options);

        expect(engine.execute().getNative()).to.equal('42 from my_module.php');
    });

    it('should push and pop a call for the top level of the included module', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    private static $firstProp = 21;

    public static function includeIt()
    {
        // Call here, before the static:: access below, to ensure the correct static class scope
        // is restored after the include (see below)
        $fetchedValue = YourClass::getIt();

        return static::$firstProp + $fetchedValue;
    }
}

class YourClass
{
    private static $secondProp = 100;

    public static function getIt()
    {
        // The scope of the top-level of the included module will be this method's,
        // so the caller's use of static:: will ensure that the top-level call
        // for this include is correctly popped off the stack again.
        $includedValue = include 'my_module.php';

        return static::$secondProp + $includedValue;
    }
}

return MyClass::includeIt();
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                include: function (path, promise) {
                    var php = nowdoc(function () {/*<<<EOS
<?php
return 10;
EOS
*/;}, {path: path}); //jshint ignore:line
                    promise.resolve(tools.syncTranspile(path, php));
                }
            },
            engine = module(options);

        expect(engine.execute().getNative()).to.equal(131);
    });

    it('should allow the include transport to provide an absolute path when fetched relatively via the "include_path"', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
// Deliberately use the current-dir and parent-dir path symbols to check for normalisation
$message = include 'my/relative/path.php';

return $message;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            options = {
                path: 'my/caller.php',
                include: function (path, promise) {
                    promise.resolve(
                        tools.syncTranspile(
                            '/my/resolved/absolute/path/to_module.php',
                            '<?php return "Hello from " . __FILE__ . "!";'
                        )
                    );
                }
            };

        expect(module(options).execute().getNative()).to.equal(
            'Hello from /my/resolved/absolute/path/to_module.php!'
        );
    });
});
