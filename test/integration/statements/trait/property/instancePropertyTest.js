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

describe('PHP trait instance property integration', function () {
    it('should allow a trait to define a public instance property', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space {
    trait MyTrait {
        public $myTraitProp = 'hello from ->myTraitProp';
    }
}

namespace Your\Stuff {
    use My\Space\MyTrait;

    class YourClass {
        use MyTrait;

        public $yourClassProp = 'hello from ->yourClassProp';
    }
}

namespace {
    $object = new \Your\Stuff\YourClass();
    $result = [];
    $result['->myTraitProp'] = $object->myTraitProp;
    $result['->yourClassProp'] = $object->yourClassProp;

    return $result;
}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            '->myTraitProp': 'hello from ->myTraitProp',
            '->yourClassProp': 'hello from ->yourClassProp'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
