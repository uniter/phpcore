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

describe('PHP interface statement "extends" integration', function () {
    it('should allow a class to extend multiple other interfaces from "use" imports', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space {
    interface MyInterface {
        const MINE = 'my const';

        public function first();
    }
}

namespace Your\Stuff {
    interface YourInterface {
        const YOURS = 'your const';

        public function second();
    }
}

namespace His\Stuff {
    use My\Space\MyInterface;
    use Your\Stuff\YourInterface;

    // In PHP, interfaces can use multiple inheritance (just not classes)
    interface HisInterface extends MyInterface, YourInterface {
        const HIS = 'his const';

        public function third();
    }
}

namespace Their\Things {
    use His\Stuff\HisInterface;

    class TheirClass implements HisInterface {
        const THEIRS = 'their const';

        public function first() {}
        public function second() {}
        public function third() {}
    }
}

namespace {
    $object = new \Their\Things\TheirClass();
    $result = [];
    $result[] = $object::MINE;
    $result[] = $object::YOURS;
    $result[] = $object::HIS;
    $result[] = $object::THEIRS;

    return $result;
}
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            'my const',
            'your const',
            'his const',
            'their const'
        ]);
    });
});
