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
    tools = require('../../tools');

describe('PHP function statement default parameter argument value handling integration', function () {
    it('should correctly handle a constant of asynchronously autoloaded class used as default argument value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    spl_autoload_register(function ($className) {
        // Note that the asynchronous call here will cause a pause to occur during autoloading
        switch (get_async($className)) {
            case 'My\Stuff\MyClass':
                class MyClass
                {
                    const MY_CONST = 21;
                }
                break;
            default:
                throw new \Exception('Unexpected class: "' . $className . '"');
        }
    });

    function myFunc($myVar = MyClass::MY_CONST) {
        return $myVar;
    }
}

namespace
{
    $result = [];

    $result['with arg omitted'] = My\Stuff\myFunc();

    return $result;
}
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

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with arg omitted': 21
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle a constant expression with multiple asynchronously autoloaded classes as default argument value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace Our\Stuff
{
    spl_autoload_register(function ($className) {
        // Note that the asynchronous call here will cause a pause to occur during autoloading
        switch (get_async($className)) {
            case 'Our\Stuff\MyClass':
                class MyClass
                {
                    const MY_CONST = 21;
                }
                break;
            case 'Our\Stuff\YourClass':
                class YourClass
                {
                    const YOUR_CONST = 10;
                }
                break;
            default:
                throw new \Exception('Unexpected class: "' . $className . '"');
        }
    });

    function myFunc($myVar = MyClass::MY_CONST + YourClass::YOUR_CONST) {
        return $myVar;
    }
}

namespace
{
    $result = [];

    $result['with arg omitted'] = Our\Stuff\myFunc();

    return $result;
}
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

        expect((await engine.execute()).getNative()).to.deep.equal({
            'with arg omitted': 31
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });

    it('should correctly handle an undefined constant being used as a default argument value', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

$result = [];

function myFunc($myVar = MY_UNDEF_CONST) {
    return $myVar;
}

$result['undef var'] = myFunc(); // Omit the arg

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'undef var': 'MY_UNDEF_CONST' // Constant's name should be used as a string (alongside the warning)
        });
        expect(engine.getStderr().readAll()).to.equal(
            'PHP Warning:  Use of undefined constant MY_UNDEF_CONST - assumed \'MY_UNDEF_CONST\' ' +
            '(this will throw an Error in a future version of PHP) in /path/to/my_module.php on line 6\n'
        );
        expect(engine.getStdout().readAll()).to.equal(
            '\nWarning: Use of undefined constant MY_UNDEF_CONST - assumed \'MY_UNDEF_CONST\' ' +
            '(this will throw an Error in a future version of PHP) in /path/to/my_module.php on line 6\n'
        );
    });
});
