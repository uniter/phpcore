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

describe('PHP<->JS Bridge integration', function () {
    it('should support exposing a number as a PHP global', function (done) {
        var module = new Function(
            'require',
            'return require(\'phpcore\').compile(function (stdin, stdout, stderr, tools, namespace) {' +
            'var namespaceScope = tools.createNamespaceScope(namespace), namespaceResult, scope = tools.globalScope, currentClass = null;' +
            'return scope.getVariable("myNum").getValue().add(tools.valueFactory.createInteger(4));' +
            'return tools.valueFactory.createNull();' +
            '});'
        )(function () {
            return phpCore;
        }),
            engine = module();

        engine.expose(18, 'myNum');

        engine.execute().then(function (result) {
            expect(result.getNative()).to.equal(22);
            done();
        }, done).catch(done);
    });
});
