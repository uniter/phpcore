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
    Exception = phpCommon.Exception,
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP function signature overloading integration', function () {
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

    it('should support overloading builtin functions via addons based on parameter count', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['with no arguments'] = myOverloadedFunc();
$result['with one argument'] = myOverloadedFunc(21);
$result['with two arguments'] = myOverloadedFunc('hello', 'world');

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'myOverloadedFunc': internals.typeOverloadedFunction([
                                    internals.typeFunction(': string', function () {
                                        return 'No arguments for me';
                                    }),
                                    internals.typeFunction('int $number : string', function (numberValue) {
                                        return 'My number was: ' + numberValue.getNative();
                                    }),
                                    internals.typeFunction('string $first, string $second : string', function (firstValue, secondValue) {
                                        return 'I said ' + firstValue.getNative() + ', ' + secondValue.getNative() + '!';
                                    })
                                ])
                            };
                        }
                    ]
                }
            ]),
            engine = module({}, environment);

        expect((await doRun(engine)).getNative()).to.deep.equal({
            'with no arguments': 'No arguments for me',
            'with one argument': 'My number was: 21',
            'with two arguments': 'I said hello, world!'
        });
        expect(outputLog).to.be.empty;
    });

    it('should throw when an overloaded function definition has no variants', async function () {
        expect(function () {
            tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'myOverloadedFunc': internals.typeOverloadedFunction([])
                            };
                        }
                    ]
                }
            ]);
        }).to.throw(
            Exception,
            'Overloaded function "myOverloadedFunc" must define at least 2 variants, 0 defined'
        );
    });

    it('should throw when an overloaded function definition has only a single variant', async function () {
        expect(function () {
            tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'myOverloadedFunc': internals.typeOverloadedFunction([
                                    internals.typeFunction(': int', function () {
                                        return 'No arguments for me';
                                    })
                                ])
                            };
                        }
                    ]
                }
            ]);
        }).to.throw(
            Exception,
            'Overloaded function "myOverloadedFunc" must define at least 2 variants, 1 defined'
        );
    });

    it('should throw when an overloaded function definition has multiple variants with the same parameter count', async function () {
        expect(function () {
            tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'myOverloadedFunc': internals.typeOverloadedFunction([
                                    internals.typeFunction('int $one, int $two : int', function () {
                                        return 'First variant';
                                    }),
                                    internals.typeFunction('int $one, int $two : int', function () {
                                        return 'Second variant';
                                    })
                                ])
                            };
                        }
                    ]
                }
            ]);
        }).to.throw(
            Exception,
            'Duplicate variants for overloaded function "myOverloadedFunc" with parameter count 2'
        );
    });

    it('should raise an ArgumentCountError when there is no overload variant for a parameter count below the minimum', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

myOverloadedFunc('first');
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'myOverloadedFunc': internals.typeOverloadedFunction([
                                    // Note that there is no variant that accepts less than two arguments.
                                    internals.typeFunction('string $one, string $two : string', function () {
                                        return 'My first variant';
                                    }),
                                    internals.typeFunction('string $one, string $two, string $three : string', function () {
                                        return 'My second variant';
                                    })
                                ])
                            };
                        }
                    ]
                }
            ]),
            engine = module({}, environment);

        await expect(doRun(engine)).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: myOverloadedFunc() expects at least 2 arguments, 1 given ' +
            'in /path/to/module.php on line 5'
        );
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught ArgumentCountError: myOverloadedFunc() expects at least 2 arguments, 1 given in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(5): myOverloadedFunc('first')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught ArgumentCountError: myOverloadedFunc() expects at least 2 arguments, 1 given in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(5): myOverloadedFunc('first')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
        ]);
    });

    it('should raise an ArgumentCountError when there is no overload variant for a parameter count between the minimum and maximum', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

myOverloadedFunc('first', 'second');
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'myOverloadedFunc': internals.typeOverloadedFunction([
                                    internals.typeFunction('string $one : string', function () {
                                        return 'My first variant';
                                    }),
                                    // Note that there is no variant that accepts exactly two arguments.
                                    internals.typeFunction('string $one, string $two, string $three : string', function () {
                                        return 'My second variant';
                                    })
                                ])
                            };
                        }
                    ]
                }
            ]),
            engine = module({}, environment);

        await expect(doRun(engine)).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: myOverloadedFunc() has no variant with exactly 2 parameters ' +
            'in /path/to/module.php on line 5'
        );
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught ArgumentCountError: myOverloadedFunc() has no variant with exactly 2 parameters in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(5): myOverloadedFunc('first', 'second')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught ArgumentCountError: myOverloadedFunc() has no variant with exactly 2 parameters in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(5): myOverloadedFunc('first', 'second')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
        ]);
    });

    it('should raise an ArgumentCountError when there is no overload variant for a parameter count above the maximum', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

// -- Some padding to inflate line numbers a bit --

myOverloadedFunc('first', 'second', 'third');
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            environment = tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                'myOverloadedFunc': internals.typeOverloadedFunction([
                                    internals.typeFunction('string $one : string', function () {
                                        return 'My first variant';
                                    }),
                                    // Note that there is no variant that accepts more than two arguments.
                                    internals.typeFunction('string $one, string $two : string', function () {
                                        return 'My second variant';
                                    })
                                ])
                            };
                        }
                    ]
                }
            ]),
            engine = module({}, environment);

        await expect(doRun(engine)).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught ArgumentCountError: myOverloadedFunc() expects at most 2 arguments, 3 given ' +
            'in /path/to/module.php on line 5'
        );
        expect(outputLog).to.deep.equal([
            nowdoc(function () {/*<<<EOS
[stderr]PHP Fatal error:  Uncaught ArgumentCountError: myOverloadedFunc() expects at most 2 arguments, 3 given in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(5): myOverloadedFunc('first', 'second', 'third')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}), //jshint ignore:line

            // NB: Stdout should have a leading newline written out just before the message.
            nowdoc(function () {/*<<<EOS
[stdout]
Fatal error: Uncaught ArgumentCountError: myOverloadedFunc() expects at most 2 arguments, 3 given in /path/to/module.php:5
Stack trace:
#0 /path/to/module.php(5): myOverloadedFunc('first', 'second', 'third')
#1 {main}
  thrown in /path/to/module.php on line 5

EOS
*/;}) //jshint ignore:line
        ]);
    });
});
