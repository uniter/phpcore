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
    Call = require('../../src/Call'),
    CallFactory = require('../../src/CallFactory'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    FunctionFactory = require('../../src/FunctionFactory'),
    Namespace = require('../../src/Namespace').sync(),
    Scope = require('../../src/Scope').sync(),
    ScopeFactory = require('../../src/ScopeFactory'),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('FunctionFactory', function () {
    beforeEach(function () {
        this.call = sinon.createStubInstance(Call);
        this.callFactory = sinon.createStubInstance(CallFactory);
        this.callStack = sinon.createStubInstance(CallStack);
        this.currentClass = sinon.createStubInstance(Class);
        this.currentScope = sinon.createStubInstance(Scope);
        this.func = sinon.stub();
        this.name = 'myFunction';
        this.namespace = sinon.createStubInstance(Namespace);
        this.scope = sinon.createStubInstance(Scope);
        this.scopeFactory = sinon.createStubInstance(ScopeFactory);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.callFactory.create.returns(this.call);
        this.scopeFactory.create.returns(this.scope);

        this.factory = new FunctionFactory(this.scopeFactory, this.callFactory, this.valueFactory, this.callStack);
    });

    describe('create()', function () {
        beforeEach(function () {
            this.callCreate = function () {
                return this.factory.create(
                    this.namespace,
                    this.currentClass,
                    this.currentScope,
                    this.func,
                    this.name
                );
            }.bind(this);
        });

        it('should store the function name against the function when specified', function () {
            expect(this.callCreate().funcName).to.equal('myFunction');
        });

        it('should store null as the function name against the function when not specified', function () {
            this.name = '';

            expect(this.callCreate().funcName).to.be.null;
        });

        it('should store the current scope against the function', function () {
            expect(this.callCreate().scopeWhenCreated).to.equal(this.currentScope);
        });

        it('should return a wrapper function', function () {
            expect(this.callCreate()).to.be.a('function');
        });

        describe('the wrapper function returned', function () {
            it('should return the result from the wrapped function', function () {
                this.func.returns(123);

                expect(this.callCreate()()).to.equal(123);
            });

            it('should push the call onto the stack', function () {
                this.callCreate()();

                expect(this.callStack.push).to.have.been.calledOnce;
                expect(this.callStack.push).to.have.been.calledWith(sinon.match.same(this.call));
            });

            it('should pop the call off the stack when the wrapped function returns', function () {
                this.callCreate()();

                expect(this.callStack.pop).to.have.been.calledOnce;
            });

            it('should pop the call off the stack even when the wrapped function throws', function () {
                var error = new Error('argh');
                this.func.throws(error);

                expect(function () {
                    this.callCreate()();
                }.bind(this)).to.throw(error);
                expect(this.callStack.pop).to.have.been.calledOnce;
            });

            it('should pass the scope as the thisObject when calling the wrapped function', function () {
                this.callCreate()();

                expect(this.func).to.have.been.calledOn(sinon.match.same(this.scope));
            });

            it('should pass arguments through to the wrapped function', function () {
                this.callCreate()(123, 'second', 'another');

                expect(this.func).to.have.been.calledWith(123, 'second', 'another');
            });
        });
    });
});
