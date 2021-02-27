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
    tools = require('../../../../tools');

describe('PHP builtin FFI options synchronous mode integration', function () {
    it('should support configuring default options', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return get_my_option();
EOS
*/;}), //jshint ignore:line
            runtime = tools.createSyncRuntime(),
            module = tools.transpile(runtime, '/path/to/my_module.php', php);

        runtime.configure({
            'my_option': 21
        });
        runtime.install({
            functionGroups: [
                function (internals) {
                    return {
                        'get_my_option': function () {
                            return internals.valueFactory.createInteger(
                                internals.optionSet.getOption('my_option')
                            );
                        }
                    };
                }
            ]
        });

        expect(module().execute().getNative()).to.equal(21);
    });

    it('should give an option access to its previous value for chaining', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return get_my_option();
EOS
*/;}), //jshint ignore:line
            runtime = tools.createSyncRuntime(),
            module = tools.transpile(runtime, '/path/to/my_module.php', php);

        runtime.configure({
            'my_option': 'my initial value'
        });
        runtime.install({
            optionGroups: [
                function (internals) {
                    var initialValue = internals.optionSet.getOption('my_option');

                    return {
                        'my_option': initialValue + ', my new value'
                    };
                }
            ],

            functionGroups: [
                function (internals) {
                    return {
                        'get_my_option': function () {
                            return internals.valueFactory.createInteger(
                                internals.optionSet.getOption('my_option')
                            );
                        }
                    };
                }
            ]
        });

        expect(module().execute().getNative()).to.equal('my initial value, my new value');
    });
});
