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
    tools = require('./tools');

describe('PHP class autoload integration', function () {
    it('should correctly handle instantiating an asynchronously autoloaded class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
spl_autoload_register(function () {
    require 'the_module.php';
});
$object = new MyClass();
return $object->getIt();
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    public function getIt()
    {
        return 22;
    }
}
EOS
*/;}))); //jshint ignore:line
                    }, 10);
                }
            }),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.equal(22);
    });

    it('should correctly handle reading a constant of an asynchronously autoloaded class via spl_autoload_register(...)', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
spl_autoload_register(function () {
    require 'the_module.php';
});
$object = new MyClass();
return $object::MY_CONST;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    const MY_CONST = 21;
}
EOS
*/;}))); //jshint ignore:line
                    }, 10);
                }
            }),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.equal(21);
    });

    it('should correctly handle reading a constant of an asynchronously autoloaded class via __autoload(...)', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
function __autoload($class) {
    require 'the_module.php';
}
$object = new MyClass();
return $object::MY_CONST;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({
                include: function (path, promise) {
                    setTimeout(function () {
                        promise.resolve(tools.asyncTranspile(path, nowdoc(function () {/*<<<EOS
<?php
class MyClass
{
    const MY_CONST = 101;
}
EOS
*/;}))); //jshint ignore:line
                    }, 10);
                }
            }),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.equal(101);
    });

    it('should correctly handle reading a constant from an interface implemented by an asynchronously autoloaded class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
spl_autoload_register(function ($class) {
    require $class . '.php';
});

return MyClass::MY_CONST;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            environment = tools.createAsyncEnvironment({
                include: function (path, promise) {
                    setTimeout(function () {
                        if (path === 'MyClass.php') {
                            promise.resolve(tools.asyncTranspile(path, nowdoc(function () {/*<<<EOS
<?php
class MyClass implements MyInterface
{
    const NOT_MY_CONST = 23;
}
EOS
*/;}))); //jshint ignore:line
                        } else if (path === 'MyInterface.php') {
                            promise.resolve(tools.asyncTranspile(path, nowdoc(function () {/*<<<EOS
<?php
interface MyInterface
{
    const MY_CONST = 21;
}
EOS
*/;}))); //jshint ignore:line
                        } else {
                            promise.reject();
                        }
                    }, 10);
                }
            }),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.equal(21);
    });
});
