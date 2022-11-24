/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    expect = require('chai').expect,
    nowdoc = require('nowdoc'),
    phpCommon = require('phpcommon'),
    tools = require('../tools'),
    Exception = phpCommon.Exception;

describe('Custom addon with service definitions integration', function () {
    var runtime;

    beforeEach(function () {
        runtime = tools.createAsyncRuntime();
    });

    it('should support installing independent custom services', function () {
        var environment = runtime.createEnvironment({}, [
                {
                    // Define services
                    serviceGroups: function (internals) {
                        var getService = internals.getServiceFetcher();

                        return {
                            'my_first_service': function () {
                                return {fromFirst: getService('my_second_service')};
                            },
                            'my_second_service': function () {
                                return {fromSecond: 'hello world'};
                            }
                        };
                    }
                }
            ]),
            state = environment.getState();

        expect(state.getService('my_first_service')).to.deep.equal({
            fromFirst: {
                fromSecond: 'hello world'
            }
        });
    });

    it('should support installing an addon that decorates a service', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

// Throw an error and catch its message. Our custom translator will return a modified version.
try {
    someUndefinedFunction();
} catch (Throwable $throwable) {
    $result['throwable message'] = $throwable->getMessage();
}

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(runtime, '/path/to/my_module.php', php),
            environment = runtime.createEnvironment({}, [
                {
                    serviceGroups: function (internals) {
                        // By default we wouldn't be able to override a service's provider
                        // (to prevent accidentally breaking things) so we need to be explicit.
                        internals.allowServiceOverride();

                        function TranslatorDecorator(wrappedTranslator) {
                            this.wrappedTranslator = wrappedTranslator;
                        }

                        _.extend(TranslatorDecorator.prototype, {
                            addTranslation: function (locale, key, translation) {
                                return this.wrappedTranslator.addTranslation(locale, key, translation);
                            },

                            addTranslations: function (structure) {
                                return this.wrappedTranslator.addTranslations(structure);
                            },

                            setLocale: function (locale) {
                                this.wrappedTranslator.setLocale(locale);
                            },

                            translate: function (key, placeholderVariables) {
                                // Append a custom suffix to translated messages.
                                return this.wrappedTranslator.translate(key, placeholderVariables) + ' [my custom suffix]';
                            }
                        });

                        return {
                            // Override the standard built-in Translator service's provider.
                            'translator': function () {
                                var wrappedTranslator = internals.callPreviousProvider('translator');

                                return new TranslatorDecorator(wrappedTranslator);
                            }
                        };
                    }
                }
            ]),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.deep.equal({
            'throwable message': 'Call to undefined function someUndefinedFunction() [my custom suffix]'
        });
    });

    it('should capture complex circular dependency chains between services', function () {
        var environment = runtime.createEnvironment({}, [
                {
                    // Define services
                    serviceGroups: function (internals) {
                        var getService = internals.getServiceFetcher();

                        return {
                            'my_first_service': function () {
                                return {fromFirst: getService('my_second_service')};
                            },
                            'my_second_service': function () {
                                return {fromFirst: getService('my_third_service')};
                            },
                            'my_third_service': function () {
                                // Invalid, as the first service indirectly has a dependency on this one.
                                return {fromFirst: getService('my_first_service')};
                            }
                        };
                    }
                }
            ]),
            state = environment.getState();

        expect(function () {
            state.getService('my_first_service');
        }).to.throw(
            Exception,
            'Circular service dependency detected while fetching id "my_first_service", ' +
            'chain was: "my_first_service" -> "my_second_service" -> "my_third_service" -> "my_first_service"'
        );
    });
});
