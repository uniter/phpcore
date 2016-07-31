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
