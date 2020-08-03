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
    sinon = require('sinon'),
    Runtime = require('../../src/Runtime').sync(),
    Scope = require('../../src/Scope').sync(),
    Stream = require('../../src/Stream');

describe('Runtime', function () {
    var createRuntime,
        Engine,
        Environment,
        options,
        pausable,
        phpCommon,
        PHPState,
        runtime,
        state;

    beforeEach(function () {
        Environment = sinon.stub();
        Engine = sinon.stub();
        pausable = {};
        phpCommon = {};
        PHPState = sinon.stub();

        Environment.callsFake(function (newState) {
            state = newState;
        });
        Environment.prototype.getOptions = function () {
            return state.getOptions();
        };
        PHPState.callsFake(function (runtime, installedBuiltinTypes, stdin, stdout, stderr, pausable, mode, optionGroups, newOptions) {
            options = newOptions;
        });
        PHPState.prototype.getOptions = function () {
            return options;
        };

        createRuntime = function (mode) {
            mode = mode || 'async';

            runtime = new Runtime(
                Environment,
                Engine,
                PHPState,
                phpCommon,
                mode === 'async' ? pausable : null,
                mode
            );
        };
        createRuntime();
    });

    describe('constructor', function () {
        it('should throw when an invalid mode is given', function () {
            expect(function () {
                createRuntime('my-invalid-mode');
            }).to.throw('Invalid mode "my-invalid-mode" given - must be one of "async", "psync" or "sync"');
        });

        it('should throw when async mode is given but Pausable is not', function () {
            expect(function () {
                runtime = new Runtime(
                    Environment,
                    Engine,
                    PHPState,
                    phpCommon,
                    null,
                    'async'
                );
            }).to.throw('Pausable library must be provided for async mode');
        });
    });

    describe('compile()', function () {
        var wrapper;

        beforeEach(function () {
            wrapper = sinon.stub();
        });

        it('should return a factory function', function () {
            expect(runtime.compile(wrapper)).to.be.a('function');
        });

        describe('the factory function returned for async mode', function () {
            var factory;

            beforeEach(function () {
                factory = runtime.compile(wrapper);
            });

            it('should create a new Engine instance correctly', function () {
                factory({option1: 21});

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.instanceOf(Environment),
                    null,
                    sinon.match.same(phpCommon),
                    {option1: 21},
                    sinon.match.same(wrapper),
                    sinon.match.same(pausable),
                    'async'
                );
            });

            it('should return the created Engine', function () {
                var engine = sinon.createStubInstance(Engine);
                Engine.returns(engine);

                expect(factory()).to.equal(engine);
            });
        });

        describe('the factory function returned for psync mode', function () {
            var factory;

            beforeEach(function () {
                createRuntime('psync');

                factory = runtime.compile(wrapper);
            });

            it('should create a new Engine instance correctly', function () {
                factory({option1: 21});

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.instanceOf(Environment),
                    null,
                    sinon.match.same(phpCommon),
                    {option1: 21},
                    sinon.match.same(wrapper),
                    null,
                    'psync'
                );
            });
        });

        describe('the .using() method of the factory function returned', function () {
            var factory;

            beforeEach(function () {
                factory = runtime.compile(wrapper);
            });

            it('should return another factory function', function () {
                expect(factory.using({'another-option': 21})).to.be.a('function');
            });

            it('should return a factory function that provides default options', function () {
                var subFactory = factory.using({'first-option': 21});

                subFactory({'second-option': 101});

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.instanceOf(Environment),
                    null,
                    sinon.match.same(phpCommon),
                    {'first-option': 21, 'second-option': 101},
                    sinon.match.same(wrapper),
                    sinon.match.same(pausable)
                );
            });

            it('should return a factory function that provides overridable default options', function () {
                var subFactory = factory.using({'my-option': 21});

                subFactory({'my-option': 101}); // Overrides the default `my-option` with value 21

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.instanceOf(Environment),
                    null,
                    sinon.match.same(phpCommon),
                    {'my-option': 101},
                    sinon.match.same(wrapper),
                    sinon.match.same(pausable)
                );
            });

            it('should return a nestable factory function that provides overridable default options', function () {
                var subFactory = factory
                    .using({'my-option': 'initial value'})
                    .using({'my-option': 'second value', 'your-option': 'unchanged value'})
                    .using({'my-option': 'third value'});

                subFactory({'my-option': 'final value'}); // Overrides the default `my-option` with value 'final option'

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.instanceOf(Environment),
                    null,
                    sinon.match.same(phpCommon),
                    {
                        'my-option': 'final value',
                        'your-option': 'unchanged value'
                    },
                    sinon.match.same(wrapper),
                    sinon.match.same(pausable)
                );
            });

            it('should not allow the special "path" option to be overridden once set', function () {
                var subFactory = factory
                    .using({'my-option': 'initial value', 'path': '/the/path/to/use'})
                    .using({'my-option': 'second value', 'path': '/ignored/second/path'})
                    .using({'my-option': 'third value'});

                subFactory({
                    'my-option': 'final value',
                    'path': '/ignored/third/path'
                });

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match({
                        'path': '/the/path/to/use'
                    })
                );
            });

            it('should allow overriding the "path" option from a given Environment', function () {
                var environment = sinon.createStubInstance(Environment),
                    subFactory;
                environment.getOptions.returns({
                    path: '/inherited/path/option/to/ignore'
                });
                subFactory = factory
                    .using({'my-option': 'initial value', 'path': '/the/path/to/use'})
                    .using({'my-option': 'second value', 'path': '/ignored/second/path'})
                    .using({'my-option': 'third value'});

                subFactory({
                    'my-option': 'final value',
                    'path': '/ignored/third/path'
                }, environment);

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match({
                        'path': '/the/path/to/use'
                    })
                );
            });

            it('should support no arguments being passed (although pointless usage)', function () {
                var subFactory = factory.using(); // No args passed to .using(...)

                subFactory({
                    'my-option': 'my value'
                });

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match({
                        'my-option': 'my value'
                    })
                );
            });

            it('should support no arguments being passed to the resulting new factory (although pointless usage)', function () {
                var subFactory = factory.using({
                    'path': 'my/path'
                });

                subFactory(); // No args passed to the factory function

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match({
                        'path': 'my/path'
                    })
                );
            });

            it('should return a factory function that provides a default Environment', function () {
                var environment = sinon.createStubInstance(Environment),
                    subFactory = factory.using({}, environment);

                subFactory();

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(sinon.match.same(environment));
            });

            it('should return a factory function that provides an overridable default Environment', function () {
                var environment1 = sinon.createStubInstance(Environment),
                    environment2 = sinon.createStubInstance(Environment),
                    subFactory = factory.using({'my-option': 21}, environment1);

                subFactory({}, environment2);

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(sinon.match.same(environment2));
            });

            it('should return a factory function that provides a default top-level Scope', function () {
                var topLevelScope = sinon.createStubInstance(Scope),
                    subFactory = factory.using({'my-option': 21}, null, topLevelScope);

                subFactory();

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(topLevelScope)
                );
            });

            it('should return a factory function that provides an overridable default top-level Scope', function () {
                var topLevelScope1 = sinon.createStubInstance(Scope),
                    topLevelScope2 = sinon.createStubInstance(Scope),
                    subFactory = factory.using({'my-option': 21}, null, topLevelScope1);

                subFactory({}, null, topLevelScope2);

                expect(Engine).to.have.been.calledOnce;
                expect(Engine).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(topLevelScope2)
                );
            });
        });
    });

    describe('configure()', function () {
        it('should add a new option group with the provided options', function () {
            runtime.configure({
                yourOption: 1001
            });

            runtime.createEnvironment({
                myOption: 21
            });

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState.args[0][7][0]()).to.deep.equal({yourOption: 1001});
        });
    });

    describe('createEnvironment()', function () {
        it('should create a new State instance correctly when no additional addons are specified', function () {
            runtime.createEnvironment({
                myOption: 21
            });

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.same(runtime),
                {
                    bindingGroups: [],
                    classGroups: [],
                    classes: {},
                    constantGroups: [],
                    defaultINIGroups: [],
                    functionGroups: [],
                    translationCatalogues: []
                },
                sinon.match.instanceOf(Stream),
                sinon.match.instanceOf(Stream),
                sinon.match.instanceOf(Stream),
                sinon.match.same(pausable),
                'async',
                [],
                {myOption: 21}
            );
        });

        it('should create a new State instance correctly when additional addons are specified', function () {
            var bindingGroup = sinon.stub(),
                classes = {MyClass: sinon.stub()},
                classGroup = sinon.stub(),
                constantGroup = sinon.stub(),
                defaultINIGroup = sinon.stub(),
                functionGroup = sinon.stub(),
                optionGroup = sinon.stub(),
                translationCatalogue = sinon.stub();

            runtime.createEnvironment({
                myOption: 21
            }, [
                // Standard addon using a plain object
                {
                    bindingGroups: [bindingGroup],
                    classGroups: [classGroup],
                    classes: classes,
                    constantGroups: [constantGroup]
                },
                function () {
                    // Addons may also be a function that is called to fetch the addon data object

                    return {
                        defaultINIGroups: [defaultINIGroup],
                        functionGroups: [functionGroup],
                        optionGroups: [optionGroup],
                        translationCatalogues: [translationCatalogue]
                    };
                }
            ]);

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.same(runtime),
                {
                    bindingGroups: [bindingGroup],
                    classGroups: [classGroup],
                    classes: classes,
                    constantGroups: [constantGroup],
                    defaultINIGroups: [defaultINIGroup],
                    functionGroups: [functionGroup],
                    translationCatalogues: [translationCatalogue]
                },
                sinon.match.instanceOf(Stream),
                sinon.match.instanceOf(Stream),
                sinon.match.instanceOf(Stream),
                sinon.match.same(pausable),
                'async',
                [
                    optionGroup
                ],
                {myOption: 21}
            );
        });

        it('should keep addons isolated to the environment they were installed into', function () {
            runtime.createEnvironment({
                myOption: 21
            }, [
                // Standard addon using a plain object
                {
                    bindingGroups: [sinon.stub()]
                },
                function () {
                    // Addons may also be a function that is called to fetch the addon data object

                    return {
                        functionGroups: [sinon.stub()]
                    };
                }
            ]);
            PHPState.resetHistory();
            runtime.createEnvironment({myOption: 101});

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.same(runtime),
                {
                    bindingGroups: [],
                    classGroups: [],
                    classes: {},
                    constantGroups: [],
                    defaultINIGroups: [],
                    functionGroups: [],
                    translationCatalogues: []
                },
                sinon.match.instanceOf(Stream),
                sinon.match.instanceOf(Stream),
                sinon.match.instanceOf(Stream),
                sinon.match.same(pausable),
                'async',
                [],
                {myOption: 101}
            );
        });

        it('should create a new Environment instance correctly', function () {
            var state = sinon.createStubInstance(PHPState);
            PHPState.returns(state);

            runtime.createEnvironment({option1: 21});

            expect(Environment).to.have.been.calledOnce;
            expect(Environment).to.have.been.calledWith(
                sinon.match.same(state)
            );
        });

        it('should return the created Environment', function () {
            var environment = sinon.createStubInstance(Environment);
            Environment.returns(environment);

            expect(runtime.createEnvironment()).to.equal(environment);
        });
    });

    describe('install()', function () {
        it('should cause created environments to have the provided new class', function () {
            var MyClass = sinon.stub();

            runtime.install({
                classes: {
                    MyClass: MyClass
                }
            });
            runtime.createEnvironment();

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.any,
                {
                    bindingGroups: [],
                    classGroups: [],
                    classes: {
                        MyClass: sinon.match.same(MyClass)
                    },
                    constantGroups: [],
                    defaultINIGroups: [],
                    functionGroups: [],
                    translationCatalogues: []
                }
            );
        });

        it('should cause created environments to have the provided option groups', function () {
            var optionGroupFactory = sinon.stub();

            runtime.install({
                optionGroups: [
                    optionGroupFactory
                ]
            });
            runtime.createEnvironment();

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.any,
                {
                    bindingGroups: [],
                    classGroups: [],
                    classes: {},
                    constantGroups: [],
                    defaultINIGroups: [],
                    functionGroups: [],
                    translationCatalogues: []
                },
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                [
                    sinon.match.same(optionGroupFactory)
                ]
            );
        });

        it('should cause created environments to have the provided binding groups', function () {
            var bindingGroupFactory = sinon.stub();

            runtime.install({
                bindingGroups: [
                    bindingGroupFactory
                ]
            });
            runtime.createEnvironment();

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.any,
                {
                    bindingGroups: [
                        sinon.match.same(bindingGroupFactory)
                    ],
                    classGroups: [],
                    classes: {},
                    constantGroups: [],
                    defaultINIGroups: [],
                    functionGroups: [],
                    translationCatalogues: []
                },
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any
            );
        });

        it('should cause created environments to have the provided constant groups', function () {
            var constantGroupFactory = sinon.stub();

            runtime.install({
                constantGroups: [
                    constantGroupFactory
                ]
            });
            runtime.createEnvironment();

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.any,
                {
                    bindingGroups: [],
                    constantGroups: [
                        sinon.match.same(constantGroupFactory)
                    ],
                    classGroups: [],
                    classes: {},
                    defaultINIGroups: [],
                    functionGroups: [],
                    translationCatalogues: []
                },
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any
            );
        });

        it('should cause created environments to have the provided default INI option groups', function () {
            var defaultINIGroupFactory = sinon.stub();

            runtime.install({
                defaultINIGroups: [
                    defaultINIGroupFactory
                ]
            });
            runtime.createEnvironment();

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.any,
                {
                    bindingGroups: [],
                    constantGroups: [],
                    classGroups: [],
                    classes: {},
                    defaultINIGroups: [
                        sinon.match.same(defaultINIGroupFactory)
                    ],
                    functionGroups: [],
                    translationCatalogues: []
                },
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any
            );
        });

        it('should cause created environments to have the provided default translations', function () {
            var defaultTranslationCatalogue = {
                'en_GB': {
                    'my_ns': {
                        'my_key': 'My translated text'
                    }
                }
            };

            runtime.install({
                translationCatalogues: [
                    defaultTranslationCatalogue
                ]
            });
            runtime.createEnvironment();

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.any,
                {
                    bindingGroups: [],
                    constantGroups: [],
                    classGroups: [],
                    classes: {},
                    defaultINIGroups: [],
                    functionGroups: [],
                    translationCatalogues: [
                        sinon.match.same(defaultTranslationCatalogue)
                    ]
                },
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any
            );
        });

        it('should support a function being passed in that will return the builtins object', function () {
            var MyClass = sinon.stub();

            runtime.install(function () { // Pass a function in instead of the object directly
                return {
                    classes: {
                        MyClass: MyClass
                    }
                };
            });
            runtime.createEnvironment();

            expect(PHPState).to.have.been.calledOnce;
            expect(PHPState).to.have.been.calledWith(
                sinon.match.any,
                {
                    bindingGroups: [],
                    classGroups: [],
                    classes: {
                        MyClass: sinon.match.same(MyClass)
                    },
                    constantGroups: [],
                    defaultINIGroups: [],
                    functionGroups: [],
                    translationCatalogues: []
                }
            );
        });
    });
});
