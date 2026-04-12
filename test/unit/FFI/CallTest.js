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
    phpCommon = require('phpcommon'),
    tools = require('../tools'),
    Call = require('../../../src/FFI/Call'),
    Exception = phpCommon.Exception;

describe('FFI Call', function () {
    var arg1,
        arg2,
        call,
        namedArg1,
        namedArg2,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        valueFactory = state.getValueFactory();

        arg1 = valueFactory.createString('first arg');
        arg2 = valueFactory.createString('second arg');
        namedArg1 = valueFactory.createString('first named arg');
        namedArg2 = valueFactory.createString('second named arg');

        call = new Call([arg1, arg2], {
            'firstParam': namedArg1,
            'secondParam': namedArg2
        });
    });

    describe('enableStrictTypes()', function () {
        it('should raise an exception', function () {
            expect(function () {
                call.enableStrictTypes();
            }).to.throw(
                Exception,
                'FFI calls cannot be switched into strict-types mode'
            );
        });
    });

    describe('getCurrentClass()', function () {
        it('should return null', function () {
            expect(call.getCurrentClass()).to.be.null;
        });
    });

    describe('getCurrentTrait()', function () {
        it('should return null', function () {
            expect(call.getCurrentTrait()).to.be.null;
        });
    });

    describe('getFilePath()', function () {
        it('should return "(JavaScript code)"', function () {
            expect(call.getFilePath()).to.equal('(JavaScript code)');
        });
    });

    describe('getFunctionArgs()', function () {
        it('should return the arguments passed to the constructor', function () {
            expect(call.getFunctionArgs()).to.deep.equal([arg1, arg2]);
        });
    });

    describe('getFunctionName()', function () {
        it('should return "(JavaScript function)"', function () {
            expect(call.getFunctionName()).to.equal('(JavaScript function)');
        });
    });

    describe('getLastLine()', function () {
        it('should return null', function () {
            expect(call.getLastLine()).to.be.null;
        });
    });

    describe('getModule()', function () {
        it('should return null', function () {
            expect(call.getModule()).to.be.null;
        });
    });

    describe('getNamedArgs()', function () {
        it('should return the named arguments passed to the constructor', function () {
            expect(call.getNamedArgs()).to.deep.equal({
                'firstParam': namedArg1,
                'secondParam': namedArg2
            });
        });
    });

    describe('getScope()', function () {
        it('should return null', function () {
            expect(call.getScope()).to.be.null;
        });
    });

    describe('getStaticClass()', function () {
        it('should return null', function () {
            expect(call.getStaticClass()).to.be.null;
        });
    });

    describe('getThisObject()', function () {
        it('should return null', function () {
            expect(call.getThisObject()).to.be.null;
        });
    });

    describe('getTraceFilePath()', function () {
        it('should return "(JavaScript code)"', function () {
            expect(call.getTraceFilePath()).to.equal('(JavaScript code)');
        });
    });

    describe('instrument()', function () {
        it('should throw an error', function () {
            expect(function () {
                call.instrument();
            }).to.throw('Unable to instrument an FFI Call');
        });
    });

    describe('isStrictTypesMode()', function () {
        it('should return false as FFI calls are always in weak type-checking mode', function () {
            expect(call.isStrictTypesMode()).to.be.false;
        });
    });

    describe('isUserland()', function () {
        it('should return false', function () {
            expect(call.isUserland()).to.be.false;
        });
    });

    describe('resume()', function () {
        it('should not throw', function () {
            expect(function () {
                call.resume();
            }).not.to.throw();
        });
    });

    describe('suppressesErrors()', function () {
        it('should return false', function () {
            expect(call.suppressesErrors()).to.be.false;
        });
    });

    describe('suppressesOwnErrors()', function () {
        it('should return false', function () {
            expect(call.suppressesOwnErrors()).to.be.false;
        });
    });

    describe('throwInto()', function () {
        it('should not throw', function () {
            expect(function () {
                call.throwInto();
            }).not.to.throw();
        });
    });
});
