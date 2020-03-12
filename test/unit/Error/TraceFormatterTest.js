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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    TraceFormatter = require('../../../src/Error/TraceFormatter'),
    Translator = phpCommon.Translator,
    ValueFactory = require('../../../src/ValueFactory').sync(),
    Variable = require('../../../src/Variable').sync();

describe('TraceFormatter', function () {
    var traceFormatter,
        translator,
        valueFactory;

    beforeEach(function () {
        translator = sinon.createStubInstance(Translator);
        valueFactory = new ValueFactory();

        translator.translate.callsFake(function (translationKey, placeholderVariables) {
            return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
        });

        traceFormatter = new TraceFormatter(translator);
    });

    describe('format()', function () {
        it('should return a correctly formatted trace string', function () {
            var variable = sinon.createStubInstance(Variable),
                trace = [{
                    index: 0,
                    file: '/path/to/my/third.php',
                    line: null,
                    func: 'thirdFunc',
                    args: [valueFactory.createString('third call, only arg')]
                }, {
                    index: 1,
                    file: '/path/to/my/second.php',
                    line: 21,
                    func: 'secondFunc',
                    args: [
                        valueFactory.createString('second call, first arg'),
                        valueFactory.createString('second call, second arg'),
                        variable // Simulate passing a variable/reference in rather than a value
                    ]
                }, {
                    index: 2,
                    file: '/path/to/my/first.php',
                    line: 101,
                    func: 'firstFunc',
                    args: [valueFactory.createInteger(20002)]
                }];
            variable.formatAsString.returns('\'My formatted variable\'');

            expect(traceFormatter.format(trace)).to.equal(
                nowdoc(function () {/*<<<EOS
#0 /path/to/my/third.php([Translated] core.unknown {}): thirdFunc('third call, onl...')
#1 /path/to/my/second.php(21): secondFunc('second call, fi...', 'second call, se...', 'My formatted variable')
#2 /path/to/my/first.php(101): firstFunc(20002)
#3 {main}
EOS
*/;}) //jshint ignore:line
            );
        });
    });
});
