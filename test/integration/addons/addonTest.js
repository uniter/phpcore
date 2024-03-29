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
    tools = require('../tools');

describe('Custom addon integration', function () {
    var runtime;

    beforeEach(function () {
        runtime = tools.createAsyncRuntime();
    });

    it('should support installing an addon into the runtime with a binding', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return get_my_value();
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(runtime, '/path/to/my_module.php', php),
            engine;

        runtime.install({
            bindingGroups: [
                function () {
                    return {
                        'my_binding': function (bindingOptions) {
                            return bindingOptions.my_option;
                        }
                    };
                }
            ],
            functionGroups: [
                function (internals) {
                    return {
                        'get_my_value': function () {
                            return internals.valueFactory.coerce(internals.getBinding('my_binding'));
                        }
                    };
                }
            ]
        });
        engine = module({
            my_binding: {
                my_option: 21
            }
        });

        expect((await engine.execute()).getNative()).to.equal(21);
    });

    describe('when installing an addon into an environment (rather than into the entire runtime)', function () {
        var environment,
            module;

        beforeEach(function () {
            var php = nowdoc(function () {/*<<<EOS
<?php
return double_it(21);
EOS
*/;}); //jshint ignore:line
            environment = runtime.createEnvironment({}, [
                {
                    functionGroups: function (internals) {
                        return {
                            'double_it': function (myArgReference) {
                                return internals.valueFactory.createInteger(myArgReference.getNative() * 2);
                            }
                        };
                    }
                }
            ]);

            runtime.install({
                functionGroups: [
                    function (internals) {
                        return {
                            'function_exists': function (functionNameReference) {
                                return internals.valueFactory.createBoolean(
                                    internals.globalNamespace.hasFunction(
                                        functionNameReference.getValue().getNative()
                                    )
                                );
                            }
                        };
                    }
                ]
            });

            module = tools.transpile(runtime, '/path/to/my_module.php', php);
        });

        it('should correctly install the addon', async function () {
            var engine = module({}, environment);

            expect((await engine.execute()).getNative()).to.equal(42);
        });

        it('should keep the addon isolated to the environment', async function () {
            var module2;
            await module({}, environment).execute();
            module2 = tools.transpile(runtime, null, '<?php return function_exists("double_it");');

            expect((await module2().execute()).getNative()).to.be.false;
        });
    });
});
