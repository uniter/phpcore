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

describe('PHP trait instance method integration', function () {
    it('should allow a trait to define a public instance method', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space {
    trait MyTrait {
        public function myTraitMethod(): string {
            return 'hello from myTraitMethod';
        }
    }
}

namespace Your\Stuff {
    use My\Space\MyTrait;

    class YourClass {
        use MyTrait;

        public function yourClassMethod(): string {
            return 'hello from yourClassMethod';
        }
    }
}

namespace {
    $object = new \Your\Stuff\YourClass();
    $result = [];
    $result['myTraitMethod()'] = $object->myTraitMethod();
    $result['yourClassMethod()'] = $object->yourClassMethod();

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
