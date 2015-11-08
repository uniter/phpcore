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
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    nowdoc = require('nowdoc'),
    syncPHPCore = require('../../sync'),
    PHPParseError = phpCommon.PHPParseError;

describe('PHP synchronous "include" statement integration', function () {
    it('should correctly handle an include where the loader returns a PHP code string', function () {
        var module = new Function(
            'require',
            'return require(\'phpcore\').compile(function (stdin, stdout, stderr, tools, namespace) {' +
            'var namespaceScope = tools.createNamespaceScope(namespace), namespaceResult, scope = tools.globalScope, currentClass = null;' +
            'scope.getVariable("num").setValue(tools.include(tools.valueFactory.createString("abc.php").getNative()));' +
            'return scope.getVariable("num").getValue();' +
            'return tools.valueFactory.createNull();' +
            '});'
        )(function () {
            return syncPHPCore;
        }),
            options = {
                include: function (path, promise) {
                    promise.resolve('<?php return 22;');
                }
            };

        expect(module(options).execute().getNative()).to.equal(22);
    });

    it('should correctly handle an include where the loader returns a compiled wrapper function', function () {
        var parentPHP = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            parentJS = phpToJS.transpile(phpToAST.create().parse(parentPHP)),
            module = new Function(
                'require',
                'return ' + parentJS
            )(function () {
                return syncPHPCore;
            }),
            childPHP = nowdoc(function () {/*<<<EOS
<?php
print 'inside';
EOS
*/;}), //jshint ignore:line
            childJS = phpToJS.transpile(phpToAST.create().parse(childPHP)),
            childModule = new Function(
                'require',
                'return ' + childJS
            )(function () {
                return syncPHPCore;
            }),
            options = {
                include: function (path, promise) {
                    promise.resolve(childModule);
                }
            },
            engine = module(options);

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal('before inside after');
    });

    it('should pass the calling file\s path to the transport', function () {
        var module = new Function(
            'require',
            'return require(\'phpcore\').compile(function (stdin, stdout, stderr, tools, namespace) {' +
            'var namespaceScope = tools.createNamespaceScope(namespace), namespaceResult, scope = tools.globalScope, currentClass = null;' +
            'scope.getVariable("num").setValue(tools.include(tools.valueFactory.createString("abc.php").getNative()));' +
            'return scope.getVariable("num").getValue();' +
            'return tools.valueFactory.createNull();' +
            '});'
        )(function () {
            return syncPHPCore;
        }),
            options = {
                path: 'my/caller.php',
                include: function (path, promise, callerPath) {
                    promise.resolve('<?php return "Hello from ' + callerPath + '!";');
                }
            };

        expect(module(options).execute().getNative()).to.equal('Hello from my/caller.php!');
    });

    it('should correctly trap a parse error in included file', function () {
        var module = new Function(
                'require',
                'return require(\'phpcore\').compile(function (stdin, stdout, stderr, tools, namespace) {' +
                'var namespaceScope = tools.createNamespaceScope(namespace), namespaceResult, scope = tools.globalScope, currentClass = null;' +
                'scope.getVariable("num").setValue(tools.include(tools.valueFactory.createString("abc.php").getNative()));' +
                'return scope.getVariable("num").getValue();' +
                'return tools.valueFactory.createNull();' +
                '});'
            )(function () {
                return syncPHPCore;
            }),
            options = {
                include: function (path, promise) {
                    promise.resolve('<?php abab');
                }
            };

        expect(function () {
            module(options).execute();
        }).to.throw(PHPParseError, 'PHP Parse error: syntax error, unexpected $end in abc.php on line 1');
    });

    it('should correctly trap when no include transport is configured', function () {
        var module = new Function(
                'require',
                'return require(\'phpcore\').compile(function (stdin, stdout, stderr, tools, namespace) {' +
                'var namespaceScope = tools.createNamespaceScope(namespace), namespaceResult, scope = tools.globalScope, currentClass = null;' +
                'tools.include(tools.valueFactory.createString("abc.php").getNative());' +
                'return tools.valueFactory.createNull();' +
                '});'
            )(function () {
                return syncPHPCore;
            });

        expect(function () {
            module().execute();
        }).to.throw('include(abc.php) :: No "include" transport is available for loading the module.');
    });

    it('should use the same stdout stream for included modules', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return syncPHPCore;
            }),
            options = {
                include: function (path, promise) {
                    promise.resolve('<?php print 21 + 2;');
                }
            },
            engine = module(options);

        engine.execute();

        expect(engine.getStdout().readAll()).to.equal('before 23 after');
    });
});
