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
    nowdoc = require('nowdoc'),
    StackCleaner = require('../../../../src/FFI/Stack/StackCleaner');

describe('StackCleaner', function () {
    var stackCleaner;

    beforeEach(function () {
        stackCleaner = new StackCleaner();
    });

    describe('cleanStack()', function () {
        describe('for an entirely JS stack with no transpiled PHP calls involved', function () {
            var stack;

            beforeEach(function () {
                stack = nowdoc(function () {/*<<<EOS
Error: Oh dear! What will we do?
    at mySecondFunc (/path/to/my/lib/third.js:90:12)
    at MyClass.myMethod (/path/to/my/lib/second.js:56:78)
    at myFirstFunc (/path/to/my/lib/first.js:12:34)
EOS
*/;}); //jshint ignore:line
            });

            it('should return the call stack unmodified', function () {
                expect(stackCleaner.cleanStack(stack)).to.equal(stack);
            });

            it('should truncate the stack frames when stackTraceLimit is given', function () {
                var expectedStack = nowdoc(function () {/*<<<EOS
Error: Oh dear! What will we do?
    at mySecondFunc (/path/to/my/lib/third.js:90:12)
    at MyClass.myMethod (/path/to/my/lib/second.js:56:78)
EOS
*/;}); //jshint ignore:line

                expect(stackCleaner.cleanStack(stack, 3)).to.equal(expectedStack);
            });
        });

        describe('for a stack containing one block of transpiled PHP calls', function () {
            var stack;

            beforeEach(function () {
                stack = nowdoc(function () {/*<<<EOS
Error: Oh dear! What will we do?
    at mySecondJSFunc (/path/to/my/bundle.js:90:12)
    at __uniterOutboundStackMarker__ (/path/to/my/bundle.js:90:12)
    at Some.phpCoreInternalFunc4 (/path/to/my/bundle.js:23:46)
    at myPHPFunc__uniterFunctionStackMarker__ (/path/to/my/bundle.js:45:12)
    at Some.phpCoreInternalFunc3 (/path/to/my/bundle.js:23:46)
    at __uniterFunctionStackMarker__ (/path/to/my/bundle.js:45:68)
    at Some.phpCoreInternalFunc2 (/path/to/my/bundle.js:23:45)
    at __uniterModuleStackMarker__ (/path/to/my/bundle.js:45:67)
    at Some.phpCoreInternalFunc1 (/path/to/my/bundle.js:12:34)
    at __uniterInboundStackMarker__ (/path/to/my/bundle.js:56:78)
    at myFirstJSFunc (/path/to/my/lib/first.js:12:34)
EOS
*/;}); //jshint ignore:line
            });

            it('should process frames from PHP modules, closures and named functions', function () {
                var expectedStack = nowdoc(function () {/*<<<EOS
Error: Oh dear! What will we do?
    at mySecondJSFunc (/path/to/my/bundle.js:90:12)
    at myPHPFunc (/path/to/my/bundle.js:45:12)
    at __uniter_php_closure__ (/path/to/my/bundle.js:45:68)
    at __uniter_php_module__ (/path/to/my/bundle.js:45:67)
    at myFirstJSFunc (/path/to/my/lib/first.js:12:34)
EOS
*/;}); //jshint ignore:line

                expect(stackCleaner.cleanStack(stack)).to.equal(expectedStack);
            });

            it('should truncate the stack frames post-cleaning when stackTraceLimit is given', function () {
                var expectedStack = nowdoc(function () {/*<<<EOS
Error: Oh dear! What will we do?
    at mySecondJSFunc (/path/to/my/bundle.js:90:12)
    at myPHPFunc (/path/to/my/bundle.js:45:12)
    at __uniter_php_closure__ (/path/to/my/bundle.js:45:68)
EOS
*/;}); //jshint ignore:line

                expect(stackCleaner.cleanStack(stack, 4)).to.equal(expectedStack);
            });
        });
    });
});
