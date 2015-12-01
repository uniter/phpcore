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
    tools = require('../tools'),
    when = require('../../when');

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
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.be.null;
        expect(engine.getStdout().readAll()).to.equal('BeforeInside');
    });

    it('should correctly handle exiting from inside a function in async mode', function (done) {
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
            module = tools.asyncTranspile(null, php),
            engine = module();

        engine.execute().then(when(done, function (result) {
            expect(result.getNative()).to.be.null;
            expect(engine.getStdout().readAll()).to.equal('BeforeInside');
        }), done);
    });

    it('should correctly handle an include exiting in sync mode', function () {
        var parentPHP = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            parentModule = tools.syncTranspile(null, parentPHP),
            childPHP = nowdoc(function () {/*<<<EOS
<?php
print 'inside';
exit(22);
print 'also inside';
EOS
*/;}), //jshint ignore:line
            childModule = tools.syncTranspile(null, childPHP),
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
        expect(engine.getStdout().readAll()).to.equal('before inside');
    });

    it('should correctly handle an include exiting in async mode', function (done) {
        var parentPHP = nowdoc(function () {/*<<<EOS
<?php
print 'before ';
include 'my_module.php';
print ' after';
EOS
*/;}), //jshint ignore:line
            parentModule = tools.asyncTranspile(null, parentPHP),
            childPHP = nowdoc(function () {/*<<<EOS
<?php
print 'inside';
exit(21);
print 'also inside';
EOS
*/;}), //jshint ignore:line
            childModule = tools.asyncTranspile(null, childPHP),
            options = {
                include: function (path, promise) {
                    promise.resolve(childModule);
                }
            },
            engine = parentModule(options);

        engine.execute().then(when(done, function (result) {
            expect(result.getType()).to.equal('exit');
            expect(result.getNative()).to.be.null;
            expect(result.getStatus()).to.equal(21);
            expect(engine.getStdout().readAll()).to.equal('before inside');
        }), done);
    });
});
