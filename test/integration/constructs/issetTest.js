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

describe('PHP isset(...) construct integration', function () {
    it('should correctly handle accessing set variables, elements and properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    public static $myProp = 0;
}

$object = new stdClass;
$aRandomVar = 21;
$anArray = ['anElement' => 100];
$anObject = (object)['aProp' => 27];

$result = [];
$result['random var'] = isset($aRandomVar);
$result['array element'] = isset($anArray['anElement']);
$result['instance property'] = isset($anObject->aProp);
$result['static property'] = isset(MyClass::$myProp);
$result['multiple set values'] = isset($aRandomVar, MyClass::$myProp);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'random var': true,
            'array element': true,
            'instance property': true,
            'static property': true,
            'multiple set values': true
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle accessing undefined variables, elements and properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {}

$object = new stdClass;

$result = [];
$result['random var'] = isset($aRandomVar);
$result['array element'] = isset($result['aRandomElement']);
$result['instance property'] = isset($object->aProp);
$result['static property'] = isset(MyClass::$myProp);
$result['multiple values where one is not set'] = isset($object, MyClass::$myProp);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'random var': false,
            'array element': false,
            'instance property': false,
            'static property': false,
            'multiple values where one is not set': false
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should correctly handle multiple references being given in async mode with pauses', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myObject = new stdClass;
$myNumber = 21;

$result = [];
$result['multiple values with pauses where all are set'] = isset(
    $myObject,
    $myNumber,
    $myAsyncSetAccessorGlobal,
    $myAsyncSetAccessorGlobal
);
$result['multiple values with pauses where one is not set'] = isset(
    $myObject,
    $myNumber,
    $myAsyncUnsetAccessorGlobal,
    $myAsyncSetAccessorGlobal
);

return $result;
EOS
*/;}), //jshint ignore:line
            log = [],
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineGlobalAccessor(
            'myAsyncSetAccessorGlobal',
            function () {
                log.push('read of myAsyncSetAccessorGlobal');

                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve('I am a "set" value');
                    });
                });
            }
        );
        engine.defineGlobalAccessor(
            'myAsyncUnsetAccessorGlobal',
            function () {
                log.push('read of myAsyncUnsetAccessorGlobal');

                return this.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(null);
                    });
                });
            }
        );

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'multiple values with pauses where all are set': true,
                'multiple values with pauses where one is not set': false
            });
            expect(engine.getStderr().readAll()).to.equal('');
            // Ensure that we stop processing the list of references passed to isset(...)
            // as soon as an unset one is reached
            expect(log).to.deep.equal([
                'read of myAsyncSetAccessorGlobal',
                'read of myAsyncSetAccessorGlobal',
                'read of myAsyncUnsetAccessorGlobal'
                // Note that the final read of myAsyncSetAccessorGlobal should never occur,
                // due to the previous tested value being unset
            ]);
        });
    });

    it('should correctly resume past an isset(...) expression with a control structure after it', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$anUnsetVar = null;

$result = [];
$result['before control structure'] = isset(get_async($anUnsetVar));

// This control structure will clear the expression trace state
if (true) {
    $result['inside control structure'] = 'some value';
}

$result['after control structure'] = isset(get_async($anUnsetVar));

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
                'before control structure': false,
                'inside control structure': 'some value',
                'after control structure': false,
            });
            expect(engine.getStderr().readAll()).to.equal('');
        });
    });

    it('should not suppress errors from a function called inside isset(...) construct in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

function myFunc() {
    return $anotherUndefVar;
}

$result = isset($undefVar[myFunc()]);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('a_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.be.false;
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice:  Undefined variable: anotherUndefVar in a_module.php on line 5

EOS
*/;}) //jshint ignore:line
        );
    });

    it('should not suppress errors from a function called inside isset(...) construct in async mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

function myFunc() {
    return get_async($anotherUndefVar);
}

$result = isset($undefVar[myFunc()]);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('a_module.php', php),
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
            expect(resultValue.getNative()).to.be.false;
            expect(engine.getStderr().readAll()).to.equal(
                nowdoc(function () {/*<<<EOS
PHP Notice:  Undefined variable: anotherUndefVar in a_module.php on line 5

EOS
*/;}) //jshint ignore:line
            );
        });
    });
});
