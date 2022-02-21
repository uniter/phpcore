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
    it('should raise a warning when required arguments are missing in weak type-checking mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL);

$result = [];

$result['with no args'] = MyClass::myStaticMethod();
$result['with one arg'] = MyClass::myStaticMethod('first');
$result['with two args'] = MyClass::myStaticMethod('first', ['hello']);
$result['with three args'] = MyClass::myStaticMethod('first', ['hello'], ['world']);

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
            'with no args': null,
            'with one arg': null,
            'with two args': null,
            'with three args': 'All required args were passed, starting with "first"',
        });
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Warning:  MyClass::myStaticMethod() expects at least 3 parameters, 0 given in /path/to/my_module.php on line 6
PHP Warning:  MyClass::myStaticMethod() expects at least 3 parameters, 1 given in /path/to/my_module.php on line 7
PHP Warning:  MyClass::myStaticMethod() expects at least 3 parameters, 2 given in /path/to/my_module.php on line 8

EOS
*/;}) //jshint ignore:line
        );
    });
});
