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
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    syncPhpCore = require('../../sync');

describe('PHP synchronous constant access integration', function () {
    it('should correctly handle fetching a constant', function () {
        var js = phpToJS.transpile(phpToAST.create().parse('// Do nothing.')),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return syncPhpCore;
            }),
            engine = module();

        engine.execute();

        expect(engine.getConstant('PHP_EOL')).to.equal('\n');
    });

    it('should correctly handle fetching an undefined constant', function () {
        var js = phpToJS.transpile(phpToAST.create().parse('// Do nothing.')),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return syncPhpCore;
            }),
            engine = module();

        engine.execute();

        expect(engine.getConstant('AN_UNDEFINED_CONSTANT')).to.be.null;
    });
});
