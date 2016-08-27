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
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('FunctionFactory', function () {
    beforeEach(function () {
        this.call = sinon.createStubInstance(Call);
        this.callFactory = sinon.createStubInstance(CallFactory);
        this.callStack = sinon.createStubInstance(CallStack);
        this.currentClass = sinon.createStubInstance(Class);
        this.func = sinon.stub();
        this.name = 'myFunction';
        this.namespace = sinon.createStubInstance(Namespace);
        this.scope = sinon.createStubInstance(Scope);
        this.scopeFactory = sinon.createStubInstance(ScopeFactory);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.callFactory.create.returns(this.call);
        this.scopeFactory.create.returns(this.scope);

        this.valueFactory.isValue.restore();
        sinon.stub(this.valueFactory, 'isValue', function (value) {
            return value instanceof Value;
        });

        this.factory = new FunctionFactory(this.scopeFactory, this.callFactory, this.valueFactory, this.callStack);
    });

    describe('create()', function () {
        beforeEach(function () {
            this.callCreate = function (currentObject) {
                return this.factory.create(
                    this.namespace,
                    this.currentClass,
                    this.func,
                    this.name,
                    currentObject || null
                );
            }.bind(this);
        });

        it('should store the function name against the function when specified', function () {
            expect(this.callCreate().funcName).to.equal('myFunction');
        });

        it('should store the correct function name against the function when not specified', function () {
            this.name = '';
            this.namespace.getPrefix.returns('My\\Namespace\\');

            expect(this.callCreate().funcName).to.equal('My\\Namespace\\{closure}');
        });

        it('should return a wrapper function', function () {
            expect(this.callCreate()).to.be.a('function');
        });

        describe('the wrapper function returned', function () {
            it('should return the result from the wrapped function', function () {
                this.func.returns(123);

                expect(this.callCreate()()).to.equal(123);
            });

            it('should pass the Namespace to the ScopeFactory', function () {
                this.callCreate()();

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.same(this.namespace)
                );
            });

            it('should pass the current Class to the ScopeFactory', function () {
                this.callCreate()();

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(this.currentClass)
                );
            });

            it('should pass the wrapper function to the ScopeFactory', function () {
                var wrapperFunction = this.callCreate();

                wrapperFunction();

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(wrapperFunction)
                );
            });

            it('should pass the `$this` object to the ScopeFactory when provided', function () {
                var currentObject = sinon.createStubInstance(Value);

                this.callCreate(currentObject)();

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(currentObject)
                );
            });

            it('should pass the (JS) `this` object as the (PHP) `$this` object when not provided', function () {
                var jsThisObjectValue = sinon.createStubInstance(Value);

                this.callCreate(null).call(jsThisObjectValue);

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(jsThisObjectValue)
                );
            });

            it('should pass null as the `$this` object when not provided and a non-Value (JS) `this` object was used', function () {
                var nonValueThisObject = {};

                this.callCreate(null).call(nonValueThisObject);

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    null
                );
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
