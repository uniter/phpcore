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
    phpCore = require('../..');

describe('PHP "return" statement integration', function () {
    it('should return the expected result for a simple return statement', function (done) {
        var module = new Function(
            'require',
            'return require(\'phpcore\').compile(function (stdin, stdout, stderr, tools, namespace) {' +
            'var namespaceScope = tools.createNamespaceScope(namespace), namespaceResult, scope = tools.globalScope, currentClass = null;' +
            'return tools.valueFactory.createInteger(4);' +
            'return tools.valueFactory.createNull();' +
            '});'
        )(function () {
            return phpCore;
        });

        module().execute().then(function (result) {
            expect(result.getNative()).to.equal(4);
            done();
        }, done).catch(done);
    });
});
