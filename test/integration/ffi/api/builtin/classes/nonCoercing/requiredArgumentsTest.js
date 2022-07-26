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
    tools = require('../../../../../tools');

describe('PHP builtin FFI class method non-coercion required parameter arguments integration', function () {
    it('should raise a fatal error when required arguments are missing for exact count', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

function tryCall(callable $callback) {
    $result = null;
    $throwable = null;

    try {
        $result = $callback();
    } catch (\Throwable $caughtThrowable) {
        $throwable = $caughtThrowable->getMessage();
    }

    return [
        'result' => $result,
        'throwable' => $throwable
    ];
}

$result['with no args'] = tryCall(function () {
    return MyClass::myStaticMethod();
});
$result['with one arg'] = tryCall(function () {
    return MyClass::myStaticMethod('first');
});
$result['with two args'] = tryCall(function () {
    return MyClass::myStaticMethod('first', ['hello']);
});
$result['with three args'] = tryCall(function () {
    return MyClass::myStaticMethod('first', ['hello'], ['world']);
});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            environment = tools.createSyncEnvironment({}, [
                {
                    classGroups: [
                        function () {
                            return {
                                'MyClass': function (internals) {
                                    internals.disableAutoCoercion();

                                    function MyClass() {}

                                    MyClass.prototype.myStaticMethod = internals.typeStaticMethod(
                                        'mixed $firstParam, iterable $secondParam, array $thirdParam',
                                        function (firstParamReference) {
                                            var firstArg = firstParamReference.getValue().getNative();

                                            return 'All required args were passed, starting with "' + firstArg + '"';
                                        }
                                    );

                                    return MyClass;
                                }
                            };
                        }
                    ]
                }
            ]),
            engine = module({}, environment);

        expect(engine.execute().getNative()).to.deep.equal({
            'with no args': {
                'result': null,
                'throwable': 'MyClass::myStaticMethod() expects exactly 3 arguments, 0 given'
            },
            'with one arg': {
                'result': null,
                'throwable': 'MyClass::myStaticMethod() expects exactly 3 arguments, 1 given'
            },
            'with two args': {
                'result': null,
                'throwable': 'MyClass::myStaticMethod() expects exactly 3 arguments, 2 given'
            },
            'with three args': {
                'result': 'All required args were passed, starting with "first"',
                'throwable': null
            }
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should raise a fatal error when required arguments are missing for minimum count', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

function tryCall(callable $callback) {
    $result = null;
    $throwable = null;

    try {
        $result = $callback();
    } catch (\Throwable $caughtThrowable) {
        $throwable = $caughtThrowable->getMessage();
    }

    return [
        'result' => $result,
        'throwable' => $throwable
    ];
}

$result['with no args'] = tryCall(function () {
    return MyClass::myStaticMethod();
});
$result['with one arg'] = tryCall(function () {
    return MyClass::myStaticMethod('first');
});
$result['with two args'] = tryCall(function () {
    return MyClass::myStaticMethod('first', ['hello']);
});
$result['with three args'] = tryCall(function () {
    return MyClass::myStaticMethod('first', ['hello'], ['world']);
});

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            environment = tools.createSyncEnvironment({}, [
                {
                    classGroups: [
                        function () {
                            return {
                                'MyClass': function (internals) {
                                    internals.disableAutoCoercion();

                                    function MyClass() {}

                                    MyClass.prototype.myStaticMethod = internals.typeStaticMethod(
                                        'mixed $firstParam, iterable $secondParam, array $optionalThirdParam = []',
                                        function (firstParamReference) {
                                            var firstArg = firstParamReference.getValue().getNative();

                                            return 'All required args were passed, starting with "' + firstArg + '"';
                                        }
                                    );

                                    return MyClass;
                                }
                            };
                        }
                    ]
                }
            ]),
            engine = module({}, environment);

        expect(engine.execute().getNative()).to.deep.equal({
            'with no args': {
                'result': null,
                'throwable': 'MyClass::myStaticMethod() expects at least 2 arguments, 0 given'
            },
            'with one arg': {
                'result': null,
                'throwable': 'MyClass::myStaticMethod() expects at least 2 arguments, 1 given'
            },
            'with two args': {
                'result': 'All required args were passed, starting with "first"',
                'throwable': null
            },
            'with three args': {
                'result': 'All required args were passed, starting with "first"',
                'throwable': null
            }
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
