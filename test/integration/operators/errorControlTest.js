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

describe('PHP error control @(...) operator integration', function () {
    it('should suppress errors in the current scope and any sub-call scopes in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

function badFunc() {
    print $myUndefVar; // Should raise a notice
    return 21;
}
function goodFunc($msg) {
    return 22;
}
function returnIt($it) {
    return $it;
}
function badFunc2() {
    return returnIt($anUndefVar);
}

$result = [];
$result['unset var, @ before var'] = @$anUnsetVar;
@$result['unset var, @ before array access'] = $anotherUnsetVar;
$result['badFunc'] = @badFunc();
$result['goodFunc'] = goodFunc(@$andAnotherUnsetVar);
$result['no suppression'] = $undefVarWithNoSuppression;
$result['badFunc2'] = @badFunc2();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/some/module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'unset var, @ before var': null,
            'unset var, @ before array access': null,
            'badFunc': 21,
            'goodFunc': 22,
            'no suppression': null,
            'badFunc2': null
        });
        // Only the unsuppressed expression should be able to raise an error
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice:  Undefined variable: undefVarWithNoSuppression in /some/module.php on line 23

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should suppress errors in the current scope and any sub-call scopes in async mode with pauses', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

function badFunc() {
    print $myUndefVar; // Should raise a notice, but gets suppressed at the callsite
    return get_async(21);
}
function goodFunc($msg) {
    return get_async(22);
}
function returnIt($it) {
    return get_async($it);
}
function badFunc2() {
    return get_async(returnIt($anUndefVar));
}

$result = [];
$result['unset var, @ before var'] = @$anUnsetVar;
@$result['unset var, @ before array access'] = $anotherUnsetVar;
@$result['unset var from get_async()'] = get_async($anotherUnsetVar);
$result['array access with async key fetch'] = @$unsetArrayVar[get_async('my_key')][21];
$result['async accessor global get'] = @$my_async_accessor_global;
$result['badFunc'] = @badFunc();
$result['goodFunc'] = goodFunc(@$andAnotherUnsetVar);
$result['no suppression'] = $undefVarWithNoSuppression;
$result['badFunc2'] = @badFunc2();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/some/module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });
        engine.defineGlobalAccessor(
            'my_async_accessor_global',
            function () {
                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(21);
                    });
                });
            }
        );

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'unset var, @ before var': null,
                'unset var, @ before array access': null,
                'unset var from get_async()': null,
                'array access with async key fetch': null,
                'async accessor global get': 21,
                'badFunc': 21,
                'goodFunc': 22,
                'no suppression': null,
                'badFunc2': null
            });
            // Only the unsuppressed expression should be able to raise an error
            expect(engine.getStderr().readAll()).to.equal(
                nowdoc(function () {/*<<<EOS
PHP Notice:  Undefined variable: undefVarWithNoSuppression in /some/module.php on line 26

EOS
*/;}) //jshint ignore:line
            );
        });
    });

    it('should correctly resume past an error control expression with a control structure after it', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$anUnsetVar = null;

$result = [];
$result['before control structure'] = @get_async($anUnsetVar);

// This control structure will clear the expression trace state
if (true) {
    $result['inside control structure'] = 'some value';
}

$result['after control structure'] = @get_async($anUnsetVar);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'before control structure': null,
                'inside control structure': 'some value',
                'after control structure': null,
            });
            expect(engine.getStderr().readAll()).to.equal('');
        });
    });
});
