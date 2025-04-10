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
    tools = require('../../../tools');

describe('PHP trait static method integration', function () {
    it('should allow a trait to define a public static method', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space {
    trait MyTrait {
        public static function myTraitMethod(): string {
            return 'hello from myTraitMethod';
        }
    }
}

namespace Your\Stuff {
    use My\Space\MyTrait;

    class YourClass {
        use MyTrait;

        public static function yourClassMethod(): string {
            return 'hello from yourClassMethod';
        }
    }
}

namespace {
    $result = [];
    $result['myTraitMethod()'] = \Your\Stuff\YourClass::myTraitMethod();
    $result['yourClassMethod()'] = \Your\Stuff\YourClass::yourClassMethod();

    return $result;
}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'myTraitMethod()': 'hello from myTraitMethod',
            'yourClassMethod()': 'hello from yourClassMethod'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
