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

describe('PHP trait constant integration', function () {
    it('should allow a trait to define a constant', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space {
    trait MyTrait {
        const MY_TRAIT_CONST = 'hello from ::MY_TRAIT_CONST';
    }
}

namespace Your\Stuff {
    use My\Space\MyTrait;

    class YourClass {
        use MyTrait;

        const MY_CLASS_CONST = 'hello from ::MY_CLASS_CONST';
    }
}

namespace {
    $result = [];
    $result['::MY_TRAIT_CONST'] = \Your\Stuff\YourClass::MY_TRAIT_CONST;
    $result['::MY_CLASS_CONST'] = \Your\Stuff\YourClass::MY_CLASS_CONST;

    return $result;
}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            '::MY_TRAIT_CONST': 'hello from ::MY_TRAIT_CONST',
            '::MY_CLASS_CONST': 'hello from ::MY_CLASS_CONST'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should allow a class to access constants defined by a trait used by another trait', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
trait BaseTrait {
    const BASE_CONST = 21;
    const OTHER_BASE_CONST = 'hello';
}

trait DerivedTrait {
    use BaseTrait;
}

class MyClass {
    use DerivedTrait;
}

$result = [];
$result['BASE_CONST'] = MyClass::BASE_CONST;
$result['OTHER_BASE_CONST'] = MyClass::OTHER_BASE_CONST;
return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'BASE_CONST': 21,
            'OTHER_BASE_CONST': 'hello'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
