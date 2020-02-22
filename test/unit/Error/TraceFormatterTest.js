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
    TraceFormatter = require('../../../src/Error/TraceFormatter'),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('TraceFormatter', function () {
    beforeEach(function () {
        this.valueFactory = new ValueFactory();

        this.traceFormatter = new TraceFormatter();
    });

    describe('format()', function () {
        it('should return a correctly formatted trace string', function () {
            var trace = [{
                index: 0,
                file: '/path/to/my/third.php',
                line: 1234,
                func: 'thirdFunc',
                args: [this.valueFactory.createString('third call, only arg')]
            }, {
                index: 1,
                file: '/path/to/my/second.php',
                line: 21,
                func: 'secondFunc',
                args: [
                    this.valueFactory.createString('second call, first arg'),
                    this.valueFactory.createString('second call, second arg')
                ]
            }, {
                index: 2,
                file: '/path/to/my/first.php',
                line: 101,
                func: 'firstFunc',
                args: [this.valueFactory.createInteger(20002)]
            }];

            expect(this.traceFormatter.format(trace)).to.equal(
                nowdoc(function () {/*<<<EOS
#0 /path/to/my/third.php(1234): thirdFunc('third call, onl...')
#1 /path/to/my/second.php(21): secondFunc('second call, fi...', 'second call, se...')
#2 /path/to/my/first.php(101): firstFunc(20002)
#3 {main}
EOS
*/;}) //jshint ignore:line
            );
        });
    });
});
