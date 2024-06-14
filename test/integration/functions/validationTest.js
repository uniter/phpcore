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
    tools = require('../tools'),
    Exception = phpCommon.Exception;

describe('PHP function validation integration', function () {
    it('should throw when an invalid builtin function definition is given', async function () {
        expect(function () {
            tools.createAsyncEnvironment({}, [
                {
                    functionGroups: [
                        function () {
                            return {
                                'myInvalidFunc': 21 // Not a valid function definition or alias.
                            };
                        }
                    ]
                }
            ]);
        }).to.throw(
            Exception,
            'Invalid definition given for builtin function "myInvalidFunc"'
        );
    });
});
