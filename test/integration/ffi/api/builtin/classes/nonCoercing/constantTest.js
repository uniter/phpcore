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

describe('PHP builtin FFI class constant integration', function () {
    it('should allow builtin classes to define class constants', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];

$result['read of constant defined with native'] = MyClass::MY_CONST_DEFINED_WITH_NATIVE;
$result['read of constant defined with value'] = MyClass::MY_CONST_DEFINED_WITH_VALUE;

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

                                    internals.defineConstant(
                                        'MY_CONST_DEFINED_WITH_NATIVE',
                                        'my native value'
                                    );
                                    internals.defineConstant(
                                        'MY_CONST_DEFINED_WITH_VALUE',
                                        internals.valueFactory.createString('my value')
                                    );

                                    function MyClass() {}

                                    return MyClass;
                                }
                            };
                        }
                    ]
                }
            ]),
            engine = module({}, environment);

        expect(engine.execute().getNative()).to.deep.equal({
            'read of constant defined with native': 'my native value',
            'read of constant defined with value': 'my value'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
