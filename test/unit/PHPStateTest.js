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
    PHPState = require('../../src/PHPState').sync(),
    Stream = require('../../src/Stream'),
    Value = require('../../src/Value').sync();

describe('PHPState', function () {
    beforeEach(function () {
        this.installedBuiltinTypes = {};
        this.stdin = sinon.createStubInstance(Stream);
        this.stdout = sinon.createStubInstance(Stream);
        this.stderr = sinon.createStubInstance(Stream);
        this.pausable = {};

        this.state = new PHPState(this.installedBuiltinTypes, this.stdin, this.stdout, this.stderr, this.pausable);
    });

    describe('constructor', function () {
        it('should install non-namespaced classes into the global namespace', function () {
            this.state = new PHPState(
                {
                    classes: {
                        'MyClass': function () {
                            return sinon.stub();
                        }
                    }
                },
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable
            );

            expect(this.state.getGlobalNamespace().hasClass('MyClass')).to.be.true;
        });

        it('should install namespaced classes into the correct namespace', function () {
            var MyClass = sinon.stub();
            this.state = new PHPState(
                {
                    classes: {
                        'Some\\Stuff\\AClass': function () {
                            return MyClass;
                        }
                    }
                },
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable
            );

            expect(this.state.getGlobalNamespace().hasClass('AClass')).to.be.false;
            expect(this.state.getGlobalNamespace().getDescendant('Some\\Stuff').hasClass('AClass')).to.be.true;
        });
    });

    describe('defineSuperGlobalAccessor()', function () {
        it('should install a getter for the superglobal', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            valueGetter.returns(21);

            this.state.defineSuperGlobalAccessor('MY_GLOB', valueGetter, valueSetter);

            expect(this.state.getSuperGlobalScope().getVariable('MY_GLOB').getValue().getNative()).to.equal(21);
        });

        it('should install a setter for the superglobal', function () {
            var value = sinon.createStubInstance(Value),
                valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            value.getNative.returns(27);

            this.state.defineSuperGlobalAccessor('MY_GLOB', valueGetter, valueSetter);
            this.state.getSuperGlobalScope().getVariable('MY_GLOB').setValue(value);

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledWith(27);
        });
    });

    describe('getConstant()', function () {
        it('should return the native value of the constant from the global namespace when defined', function () {
            var value = sinon.createStubInstance(Value);
            value.getNative.returns('my value');
            this.state.getGlobalNamespace().defineConstant('MY_CONST', value);

            expect(this.state.getConstant('MY_CONST')).to.equal('my value');
        });

        it('should return null when the constant is not defined', function () {
            expect(this.state.getConstant('MY_UNDEFINED_CONST')).to.be.null;
        });
    });
});
