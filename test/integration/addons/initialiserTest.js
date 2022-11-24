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
    tools = require('../tools');

describe('Custom addon with initialiser integration', function () {
    var runtime;

    beforeEach(function () {
        runtime = tools.createAsyncRuntime();
    });

    it('should support defining initialisers with access to bindings', function () {
        var myNumbers = [];

        runtime.createEnvironment({}, [
            {
                bindingGroups: [
                    function () {
                        return {
                            'myBinding': function () {
                                return {myNumber: 21};
                            }
                        };
                    }
                ],
                // Define an initialiser.
                initialiserGroups: [
                    function (internals) {
                        myNumbers.push(internals.getBinding('myBinding').myNumber);
                    }
                ]
            }
        ]);

        expect(myNumbers).to.deep.equal([21]);
    });
});
