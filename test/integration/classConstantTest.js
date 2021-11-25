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

describe('PHP class constant integration', function () {
    it('should support the magic ::class constant', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Awesome\Space
{
    class MyClass
    {
    }
}

namespace
{
    return My\Awesome\Space\MyClass::class;
}
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php);

        expect(module().execute().getNative()).to.equal('My\\Awesome\\Space\\MyClass');
    });

    it('should support constants that reference constants of other, autoloaded classes', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    spl_autoload_register(function ($className) {
        // Note that the asynchronous call here will cause a pause to occur during autoloading
        switch (get_async($className)) {
            case 'My\Stuff\MyAutoloadedClass':
                class MyAutoloadedClass
                {
                    const OTHER_CONST = 21;
                }
                break;
            default:
                throw new \Exception('Unexpected class: "' . $className . '"');
        }
    });

    class MyClass
    {
        const MY_CONST = MyAutoloadedClass::OTHER_CONST;
    }
}

namespace
{
    $result = [];

    $result['autoloaded constant'] = My\Stuff\MyClass::MY_CONST;

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

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'autoloaded constant': 21
            });
            expect(engine.getStderr().readAll()).to.equal('');
            expect(engine.getStdout().readAll()).to.equal('');
        });
    });

    it('should lazily load constants', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff
{
    class MyClass
    {
        // Although the referenced class will never exist, as long as we do not dereference this constant
        // its value should not be evaluated and so no error should be raised
        const MY_UNRESOLVABLE_CONST = SomeUndefinedClass::SOME_CONST;

        const MY_CONST = 21;
    }
}

namespace
{
    $result = [];

    $result['defined constant'] = My\Stuff\MyClass::MY_CONST;

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'defined constant': 21
        });
        expect(engine.getStderr().readAll()).to.equal('');
        expect(engine.getStdout().readAll()).to.equal('');
    });
});
