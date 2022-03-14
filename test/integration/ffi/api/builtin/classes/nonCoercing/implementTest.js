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
    tools = require('../../../../../tools');

describe('PHP builtin FFI class interface implementation integration', function () {
    it('should raise an error when a builtin attempts to implement an undefined interface', function () {
        expect(function () {
            tools.createSyncEnvironment({}, [
                {
                    classGroups: [
                        function () {
                            return {
                                'MyClass': function (internals) {
                                    internals.disableAutoCoercion();

                                    // Attempt to implement a non-existent interface.
                                    internals.implement('SomeUndefinedInterface');

                                    function MyClass() {}

                                    return MyClass;
                                }
                            };
                        }
                    ]
                }
            ]);
        }).to.throw(
            'Failed to load builtin class "MyClass": Error: ' +
            'PHP Fatal error: Uncaught Error: Class \'SomeUndefinedInterface\' not found ' +
            'in (unknown) on line (unknown)'
        );
    });
});
