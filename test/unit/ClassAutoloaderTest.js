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
    queueMicrotask = require('core-js-pure/actual/queue-microtask'),
    sinon = require('sinon'),
    tools = require('./tools'),
    ClassAutoloader = require('../../src/ClassAutoloader').sync(),
    Namespace = require('../../src/Namespace').sync(),
    Value = require('../../src/Value').sync();

describe('ClassAutoloader', function () {
    var classAutoloader,
        flow,
        futureFactory,
        globalNamespace,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        valueFactory = state.getValueFactory();

        valueFactory.setGlobalNamespace(globalNamespace);

        classAutoloader = new ClassAutoloader(valueFactory, flow);
        classAutoloader.setGlobalNamespace(globalNamespace);
    });

    describe('autoloadClass()', function () {
        it('should await an autoloader function if it returns a Future', async function () {
            var autoloadCallableValue = sinon.createStubInstance(Value),
                otherAutoloadCallableValue = sinon.createStubInstance(Value);
            autoloadCallableValue.call
                .returns(futureFactory.createFuture(function (resolve) {
                    queueMicrotask(function () {
                        globalNamespace.hasClass
                            .withArgs('My\\Stuff\\MyClass')
                            .returns(true);
                        resolve();
                    });
                }));
            classAutoloader.appendAutoloadCallable(autoloadCallableValue);
            otherAutoloadCallableValue.call
                .returns(valueFactory.createString('any result, as it will be ignored'));
            // Add a no-op autoloader just to ensure we support multiple having been registered
            classAutoloader.appendAutoloadCallable(otherAutoloadCallableValue);

            await classAutoloader.autoloadClass('My\\Stuff\\MyClass').toPromise();

            expect(autoloadCallableValue.call).to.have.been.calledOnce;
            expect(globalNamespace.hasClass('My\\Stuff\\MyClass')).to.be.true;
        });

        it('should not call any further autoloaders once the class has been loaded', async function () {
            var firstAutoloadCallableValue = sinon.createStubInstance(Value),
                secondAutoloadCallableValue = sinon.createStubInstance(Value);
            firstAutoloadCallableValue.call
                .returns(futureFactory.createFuture(function (resolve) {
                    queueMicrotask(function () {
                        globalNamespace.hasClass
                            .withArgs('My\\Stuff\\MyClass')
                            .returns(true);
                        resolve();
                    });
                }));
            secondAutoloadCallableValue.call
                .returns(valueFactory.createString('any result, as it would be ignored'));
            classAutoloader.appendAutoloadCallable(firstAutoloadCallableValue);
            classAutoloader.appendAutoloadCallable(secondAutoloadCallableValue);

            await classAutoloader.autoloadClass('My\\Stuff\\MyClass').toPromise();

            expect(firstAutoloadCallableValue.call).to.have.been.calledOnce;
            expect(secondAutoloadCallableValue.call).not.to.have.been.called;
        });

        it('should call the magic __autoload(...) function when defined', function () {
            var resultValue;
            globalNamespace.getOwnFunction
                .withArgs('__autoload')
                .returns(function (nameValue) {
                    if (nameValue.getNative() === 'My\\Stuff\\MyClass') {
                        return valueFactory.createString('my result');
                    }

                    throw new Error('Unexpected argument to __autoload(...)');
                });

            resultValue = classAutoloader.autoloadClass('My\\Stuff\\MyClass');

            // Note that the result of an autoloader function is not checked, however if a Future(Value)
            // is returned then we will need to await it.
            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my result');
        });

        it('should return null when no autoloader is registered', function () {
            var resultValue = classAutoloader.autoloadClass('My\\Stuff\\MyClass');

            expect(resultValue.getType()).to.equal('null');
        });
    });

    describe('removeAutoloadCallable()', function () {
        it('should not call a removed autoloader', async function () {
            var firstAutoloadCallableValue = sinon.createStubInstance(Value),
                secondAutoloadCallableValue = sinon.createStubInstance(Value);
            firstAutoloadCallableValue.call
                .returns(valueFactory.createString('any first result, as it would be ignored'));
            firstAutoloadCallableValue.isEqualTo
                .withArgs(sinon.match.same(firstAutoloadCallableValue))
                .returns(valueFactory.createBoolean(true));
            firstAutoloadCallableValue.isEqualTo
                .returns(valueFactory.createBoolean(false));
            secondAutoloadCallableValue.call
                .returns(valueFactory.createString('any second result, as it will be ignored'));
            secondAutoloadCallableValue.isEqualTo
                .withArgs(sinon.match.same(secondAutoloadCallableValue))
                .returns(valueFactory.createBoolean(true));
            secondAutoloadCallableValue.isEqualTo
                .returns(valueFactory.createBoolean(false));
            classAutoloader.appendAutoloadCallable(firstAutoloadCallableValue);
            classAutoloader.appendAutoloadCallable(secondAutoloadCallableValue);

            await classAutoloader.removeAutoloadCallable(firstAutoloadCallableValue);
            await classAutoloader.autoloadClass('My\\Stuff\\MyClass').toPromise();

            expect(firstAutoloadCallableValue.call).not.to.have.been.called;
            expect(secondAutoloadCallableValue.call).to.have.been.calledOnce;
        });
    });
});
