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

describe('PHP builtin FFI class method non-coercion return type integration', function () {
    it('should support a method with by-ref integer return type used in weak type-checking mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new MyClass;

$result = [];

$initialVar = '21 ';
$result['initialVar before call'] = $initialVar;

// A reference to $initialVar should be passed through and returned. On return,
// it should be converted to integer and the result written back by scalar type handling.
$returnedVar =& $myObject->passReference($initialVar);

$result['initialVar after call'] = $initialVar;
$result['returnedVar after call'] = $returnedVar;

$initialVar = 1001; // Should also update $returnedVar via reference.

$result['initialVar after set'] = $initialVar;
$result['returnedVar after set'] = $returnedVar;

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

                                    MyClass.prototype.passReference = internals.typeFunction(
                                        'mixed &$myParam : &int',
                                        function (paramReference) {
                                            return paramReference; // Just return the reference right back.
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
            'initialVar before call': '21 ',
            'initialVar after call': 21, // Should have been converted due to scalar int return type.
            'returnedVar after call': 21,
            'initialVar after set': 1001,
            'returnedVar after set': 1001 // Should have been updated via reference.
        });
    });
});
