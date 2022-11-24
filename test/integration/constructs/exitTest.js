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
    tools = require('../tools');

describe('PHP exit(...) construct integration', function () {
    it('should correctly handle exiting from inside a function in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myFunction() {
    print 'Inside';
    exit;
    print 'I should not be reached';

    return 21;
}

print 'Before';
$result = myFunction();
print 'After (I should not be reached either)';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.be.null;
        expect(engine.getStdout().readAll()).to.equal('BeforeInside');
    });

    it('should correctly handle exiting from inside a function in async mode', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myFunction() {
    print 'Inside';
    exit;
    print 'I should not be reached';

    return 21;
}

print 'Before';
$result = myFunction();
print 'After (I should not be reached either)';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.be.null;
        expect(engine.getStdout().readAll()).to.equal('BeforeInside');
    });

    it('should correctly handle an include exiting from inside a function in sync mode', function () {
        var parentPHP = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            parentModule = tools.syncTranspile('/path/to/my_module.php', parentPHP),
            childPHP = nowdoc(function () {/*<<<EOS
<?php

function myExiter()
{
    print 'func';
    exit(22);
    print 'also func';
}

print 'inside ';
myExiter();
print 'also inside';
EOS
*/;}), //jshint ignore:line
            childModule = tools.syncTranspile('/path/to/my_module.php', childPHP),
            options = {
                include: function (path, promise) {
                    promise.resolve(childModule);
                }
            },
            engine = parentModule(options),
            result = engine.execute();

        expect(result.getType()).to.equal('exit');
        expect(result.getNative()).to.be.null;
        expect(result.getStatus()).to.equal(22);
        expect(engine.getStdout().readAll()).to.equal('before inside func');
    });

    it('should correctly handle an include exiting in async mode following a pause', async function () {
        var grandparentPHP = nowdoc(function () {/*<<<EOS
<?php

print '[grandparent before]';
require '/path/to/my_parent_module.php';
print '[grandparent after]';
EOS
*/;}), //jshint ignore:line
            grandparentModule = tools.asyncTranspile('/path/to/my_grandparent_module.php', grandparentPHP),
            parentPHP = nowdoc(function () {/*<<<EOS
<?php

class MyIncluder
{
    public static function include()
    {
        print '[require before]';
        $result = require_once '/path/to/my_child_module.php';
        print '[require after]';
    }
}

print '[parent before]';
MyIncluder::include();
print '[parent after]';
EOS
*/;}), //jshint ignore:line
            parentModule = tools.asyncTranspile('/path/to/my_parent_module.php', parentPHP),
            childPHP = nowdoc(function () {/*<<<EOS
<?php

print get_async('[child before]');
exit(21);
print '[child after]';
EOS
*/;}), //jshint ignore:line
            childModule = tools.asyncTranspile('/path/to/my_child_module.php', childPHP),
            options = {
                include: function (path, promise) {
                    setImmediate(function () {
                        var module;

                        switch (path) {
                            case '/path/to/my_parent_module.php':
                                module = parentModule;
                                break;
                            case '/path/to/my_child_module.php':
                                module = childModule;
                                break;
                            default:
                                throw new Error('Unexpected path "' + path + '"');
                        }

                        promise.resolve(module);
                    });
                }
            },
            engine = grandparentModule(options),
            result;
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        result = await engine.execute();

        expect(result.getType()).to.equal('exit');
        expect(result.getNative()).to.be.null;
        expect(result.getStatus()).to.equal(21);
        expect(engine.getStdout().readAll()).to.equal('[grandparent before][parent before][require before][child before]');
    });
});
