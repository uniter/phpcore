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

describe('PHP "callable" type integration (async mode)', function () {
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

    it('should allow arguments for function parameters typed as "callable" to be autoloaded', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    spl_autoload_register(function ($className) {
        // Trigger a pause, to test handling of async operations during autoloading
        switch (get_async($className)) {
            case 'My\Stuff\ClassForStaticMethodViaString':
                class ClassForStaticMethodViaString
                {
                    public static function myStaticDoubler($input)
                    {
                        return $input * 2;
                    }
                }
                break;
            case 'My\Stuff\ClassForStaticMethodViaArray':
                class ClassForStaticMethodViaArray
                {
                    public static function myStaticDoubler($input)
                    {
                        return $input * 2;
                    }
                }
                break;
            default:
                throw new \Exception('Unexpected class name "' . $className . '"');
        }
    });
}

namespace
{
    $result = [];

    function myFunction($input, callable $myDoubler) {
        return $myDoubler($input);
    }

    // Test both variants of callable for a static method
    $result['static method via single string'] = myFunction(
        100,
        'My\Stuff\ClassForStaticMethodViaString::myStaticDoubler'
    );
    $result['static method via array'] = myFunction(
        4,
        ['My\Stuff\ClassForStaticMethodViaArray', 'myStaticDoubler']
    );

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'static method via single string': 200,
            'static method via array': 8
        });
    });

    it('should allow passing valid callables for function parameters typed as "callable"', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myFunction($input, callable $myDoubler) {
    return $myDoubler($input);
}

$result['closure'] = myFunction(21, function ($input) {
    return $input * 2;
});

class MyInvokable {
    public function __invoke($input) {
        return $input * 2;
    }
}
$result['invokable object'] = myFunction(3, new MyInvokable);

function myDoubler($input) {
    return $input * 2;
}
$result['function'] = myFunction(10, 'myDoubler');

class MyClass {
    public static function myStaticDoubler($input) {
        return $input * 2;
    }

    public function myInstanceDoubler($input) {
        return $input * 2;
    }
}
// Test both variants of callable for a static method
$result['static method via single string'] = myFunction(100, 'MyClass::myStaticDoubler');
$result['static method via array'] = myFunction(4, ['MyClass', 'myStaticDoubler']);

$result['instance method via array'] = myFunction(12, [new MyClass, 'myInstanceDoubler']);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'closure': 42,
            'invokable object': 6,
            'function': 20,
            'static method via single string': 200,
            'static method via array': 8,
            'instance method via array': 24
        });
    });

    it('should allow passing null for function parameters typed as "callable" with default null', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

function myFunction($input, callable $myDoubler = null) {
    return $myDoubler ?
        $myDoubler($input) :
        'cannot double ' . $input . ' (it was omitted)';
}

// Omit the $myDoubler argument
$result['omitted'] = myFunction(21);

$result['explicit null'] = myFunction(21, null);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'omitted': 'cannot double 21 (it was omitted)',
            'explicit null': 'cannot double 21 (it was omitted)'
        });
    });

    it('should raise an error when a callable-type parameter is given an invalid string callable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

function myFunction(callable $myCallable) {
    return $myCallable(21);
}

// Strings are valid callables, but only if they refer to a function or static method that actually exists
myFunction('I_am_not_a_valid_callable');
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        await expect(doRun(engine))
            .to.eventually.be.rejectedWith(
                PHPFatalError,
                'PHP Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myCallable) must be callable,' +
                ' string given, called in /path/to/module.php on line 10 and defined in /path/to/module.php:5' +
                // NB: Extraneous context info here is added by PHPFatalError (PHPError),
                //     but not output to stdout/stderr
                ' in /path/to/module.php on line 5'
            )
            .then(function () {
                expect(outputLog).to.deep.equal([
                    nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught TypeError: myFunction(): Argument #1 ($myCallable) must be callable, string given, called in /path/to/module.php on line 10 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(10): myFunction('I_am_not_a_vali...')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

                    // NB: Stdout should have a leading newline written out just before the message
                    nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myCallable) must be callable, string given, called in /path/to/module.php on line 10 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(10): myFunction('I_am_not_a_vali...')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
                ]);
            });
    });

    it('should raise an error when a callable-type parameter is given an invalid static-method array callable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

function myFunction(callable $myCallable) {
    return $myCallable(21);
}

// Arrays are valid callables, but only if they refer to an instance or static method that actually exists
myFunction(['My\\NonExistentClass', 'notAValidMethod']);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        await expect(doRun(engine))
            .to.eventually.be.rejectedWith(
                PHPFatalError,
                'PHP Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myCallable) must be callable,' +
                ' array given, called in /path/to/module.php on line 10 and defined in /path/to/module.php:5' +
                // NB: Extraneous context info here is added by PHPFatalError (PHPError),
                //     but not output to stdout/stderr
                ' in /path/to/module.php on line 5'
            )
            .then(function () {
                expect(outputLog).to.deep.equal([
                    nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught TypeError: myFunction(): Argument #1 ($myCallable) must be callable, array given, called in /path/to/module.php on line 10 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(10): myFunction(Array)
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

                    // NB: Stdout should have a leading newline written out just before the message
                    nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myCallable) must be callable, array given, called in /path/to/module.php on line 10 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(10): myFunction(Array)
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
                ]);
            });
    });

    it('should raise an error when a callable-type parameter is given an invalid instance-method array callable', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

function myFunction(callable $myCallable) {
    return $myCallable(21);
}

class MyClass {}

$object = new MyClass;

// Arrays are valid callables, but only if they refer to an instance or static method that actually exists
myFunction([$object, 'notAValidMethod']);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        await expect(doRun(engine))
            .to.eventually.be.rejectedWith(
                PHPFatalError,
                'PHP Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myCallable) must be callable,' +
                ' array given, called in /path/to/module.php on line 14 and defined in /path/to/module.php:5' +
                // NB: Extraneous context info here is added by PHPFatalError (PHPError),
                //     but not output to stdout/stderr
                ' in /path/to/module.php on line 5'
            )
            .then(function () {
                expect(outputLog).to.deep.equal([
                    nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught TypeError: myFunction(): Argument #1 ($myCallable) must be callable, array given, called in /path/to/module.php on line 14 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(14): myFunction(Array)
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

                    // NB: Stdout should have a leading newline written out just before the message
                    nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught TypeError: myFunction(): Argument #1 ($myCallable) must be callable, array given, called in /path/to/module.php on line 14 and defined in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(14): myFunction(Array)
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
                ]);
            });
    });
});
