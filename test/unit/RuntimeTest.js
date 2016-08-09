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
    Environment = require('../../src/Environment'),
    Runtime = require('../../src/Runtime').sync(),
    Scope = require('../../src/Scope').sync(),
    Stream = require('../../src/Stream');

describe('Runtime', function () {
    beforeEach(function () {
        this.Environment = sinon.stub();
        this.Engine = sinon.stub();
        this.OptionSet = sinon.stub();
        this.pausable = {};
        this.phpCommon = {};
        this.PHPState = sinon.stub();
        this.state = sinon.createStubInstance(this.PHPState);
        this.PHPState.returns(this.state);

        this.runtime = new Runtime(
            this.Environment,
            this.Engine,
            this.OptionSet,
            this.PHPState,
            this.phpCommon,
            this.pausable
        );
    });

    describe('compile()', function () {
        beforeEach(function () {
            this.wrapper = sinon.stub();
        });

        it('should return a factory function', function () {
            expect(this.runtime.compile(this.wrapper)).to.be.a('function');
        });

        describe('the factory function returned', function () {
            beforeEach(function () {
                this.factory = this.runtime.compile(this.wrapper);
            });

            it('should create a new Engine instance correctly', function () {
                this.factory({option1: 21});

                expect(this.Engine).to.have.been.calledOnce;
                expect(this.Engine).to.have.been.calledWith(
                    sinon.match.instanceOf(this.Environment),
                    null,
                    sinon.match.same(this.phpCommon),
                    {option1: 21},
                    sinon.match.same(this.wrapper),
                    sinon.match.same(this.pausable)
                );
            });

            it('should return the created Engine', function () {
                var engine = sinon.createStubInstance(this.Engine);
                this.Engine.returns(engine);

                expect(this.factory()).to.equal(engine);
            });
        });

        describe('the .using() method of the factory function returned', function () {
            beforeEach(function () {
                this.factory = this.runtime.compile(this.wrapper);
            });

            it('should return another factory function', function () {
                expect(this.factory.using({'another-option': 21})).to.be.a('function');
            });

            it('should return a factory function that provides default options', function () {
                var subFactory = this.factory.using({'first-option': 21});

                subFactory({'second-option': 101});

                expect(this.Engine).to.have.been.calledOnce;
                expect(this.Engine).to.have.been.calledWith(
                    sinon.match.instanceOf(this.Environment),
                    null,
                    sinon.match.same(this.phpCommon),
                    {'first-option': 21, 'second-option': 101},
                    sinon.match.same(this.wrapper),
                    sinon.match.same(this.pausable)
                );
            });

            it('should return a factory function that provides overridable default options', function () {
                var subFactory = this.factory.using({'my-option': 21});

                subFactory({'my-option': 101}); // Overrides the default `my-option` with value 21

                expect(this.Engine).to.have.been.calledOnce;
                expect(this.Engine).to.have.been.calledWith(
                    sinon.match.instanceOf(this.Environment),
                    null,
                    sinon.match.same(this.phpCommon),
                    {'my-option': 101},
                    sinon.match.same(this.wrapper),
                    sinon.match.same(this.pausable)
                );
            });

            it('should return a factory function that provides a default Environment', function () {
                var environment = sinon.createStubInstance(Environment),
                    subFactory = this.factory.using({}, environment);

                subFactory();

                expect(this.Engine).to.have.been.calledOnce;
                expect(this.Engine).to.have.been.calledWith(sinon.match.same(environment));
            });

            it('should return a factory function that provides an overridable default Environment', function () {
                var environment1 = sinon.createStubInstance(Environment),
                    environment2 = sinon.createStubInstance(Environment),
                    subFactory = this.factory.using({'my-option': 21}, environment1);

                subFactory({}, environment2);

                expect(this.Engine).to.have.been.calledOnce;
                expect(this.Engine).to.have.been.calledWith(sinon.match.same(environment2));
            });

            it('should return a factory function that provides a default top-level Scope', function () {
                var topLevelScope = sinon.createStubInstance(Scope),
                    subFactory = this.factory.using({'my-option': 21}, null, topLevelScope);

                subFactory();

                expect(this.Engine).to.have.been.calledOnce;
                expect(this.Engine).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(topLevelScope)
                );
            });

            it('should return a factory function that provides an overridable default top-level Scope', function () {
                var topLevelScope1 = sinon.createStubInstance(Scope),
                    topLevelScope2 = sinon.createStubInstance(Scope),
                    subFactory = this.factory.using({'my-option': 21}, null, topLevelScope1);

                subFactory({}, null, topLevelScope2);

                expect(this.Engine).to.have.been.calledOnce;
                expect(this.Engine).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(topLevelScope2)
                );
            });
        });
    });

    describe('createEnvironment()', function () {
        it('should create a new State instance correctly', function () {
            var optionSet = sinon.createStubInstance(this.OptionSet);
            this.OptionSet.returns(optionSet);

            this.runtime.createEnvironment();

            expect(this.PHPState).to.have.been.calledOnce;
            expect(this.PHPState).to.have.been.calledWith(
                {
                    classes: {},
                    constantGroups: [],
                    functionGroups: []
                },
                sinon.match.instanceOf(Stream),
                sinon.match.instanceOf(Stream),
                sinon.match.instanceOf(Stream),
                sinon.match.same(this.pausable),
                sinon.match.same(optionSet)
            );
        });

        it('should create a new OptionSet instance correctly', function () {
            this.runtime.createEnvironment({option1: 21});

            expect(this.OptionSet).to.have.been.calledOnce;
            expect(this.OptionSet).to.have.been.calledWith({option1: 21});
        });

        it('should create a new OptionSet instance correctly when options arg is not specified', function () {
            this.runtime.createEnvironment();

            expect(this.OptionSet).to.have.been.calledOnce;
            expect(this.OptionSet).to.have.been.calledWith({});
        });

        it('should create a new Environment instance correctly', function () {
            this.runtime.createEnvironment({option1: 21});

            expect(this.Environment).to.have.been.calledOnce;
            expect(this.Environment).to.have.been.calledWith(
                sinon.match.same(this.state)
            );
        });

        it('should return the created Environment', function () {
            var environment = sinon.createStubInstance(this.Environment);
            this.Environment.returns(environment);

            expect(this.runtime.createEnvironment()).to.equal(environment);
        });
    });

    describe('install()', function () {
        it('should cause created environments to have the provided new class', function () {
            var MyClass = sinon.stub();

            this.runtime.install({
                classes: {
                    MyClass: MyClass
                }
            });
            this.runtime.createEnvironment();

            expect(this.PHPState).to.have.been.calledOnce;
            expect(this.PHPState).to.have.been.calledWith(
                {
                    classes: {
                        MyClass: sinon.match.same(MyClass)
                    },
                    constantGroups: [],
                    functionGroups: []
                }
            );
        });
    });
});
