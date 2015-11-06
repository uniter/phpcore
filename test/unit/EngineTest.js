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
    pausable = require('pausable'),
    sinon = require('sinon'),
    Engine = require('../../src/Engine'),
    Environment = require('../../src/Environment'),
    PauseException = require('pausable/src/PauseException'),
    Runtime = require('../../src/Runtime').async(pausable);

describe('Engine', function () {
    beforeEach(function () {
        this.environment = sinon.createStubInstance(Environment);
        this.options = {};
        this.pausable = {
            createPause: function () {
                return sinon.createStubInstance(PauseException);
            }
        };
        this.phpCommon = {};
        this.phpToAST = {};
        this.phpToJS = {};
        this.runtime = sinon.createStubInstance(Runtime);
        this.wrapper = sinon.stub();

        this.createEngine = function () {
            this.engine = new Engine(
                this.runtime,
                this.environment,
                this.phpCommon,
                this.options,
                this.wrapper,
                this.pausable,
                this.phpToAST,
                this.phpToJS
            );
        }.bind(this);

        this.whenPausableIsAvailable = function () {
            this.createEngine();
        }.bind(this);
        this.whenPausableIsNotAvailable = function () {
            this.pausable = null;
            this.createEngine();
        }.bind(this);
    });

    describe('createPause()', function () {
        it('should return a PauseException when the Pausable library is available', function () {
            this.whenPausableIsAvailable();

            expect(this.engine.createPause()).to.be.an.instanceOf(PauseException);
        });

        it('should throw an exception when the Pausable library is not available', function () {
            this.whenPausableIsNotAvailable();

            expect(function () {
                this.engine.createPause();
            }.bind(this)).to.throw('Pausable is not available');
        });
    });
});
