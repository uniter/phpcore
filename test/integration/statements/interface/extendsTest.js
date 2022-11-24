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
    it('should allow an interface to extend multiple other interfaces from "use" imports', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal([
            'my const',
            'your const',
            'his const',
            'their const'
        ]);
    });

    it('should allow an interface to extend another interface defined after it', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space {
    interface MyFirstInterface extends MySecondInterface {
        const FIRST_CONST = 'first value';
    }

    interface MySecondInterface {
        const SECOND_CONST = 'second value';
    }
}

namespace {
    use My\Space\MyFirstInterface;

    $result = [];

    $result['first const'] = MyFirstInterface::FIRST_CONST;
    $result['second const'] = MyFirstInterface::SECOND_CONST;

    return $result;
}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'first const': 'first value',
            'second const': 'second value'
        });
    });

    it('should allow two interfaces to have members referring to the other', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Space {
    interface MyFirstInterface {
        const MY_CONST = 'first value';

        const FIRST_CONST = MySecondInterface::MY_CONST;
    }

    interface MySecondInterface {
        const MY_CONST = 'second value';

        const SECOND_CONST = MyFirstInterface::MY_CONST;
    }
}

namespace {
    use My\Space\MyFirstInterface;
    use My\Space\MySecondInterface;

    $result = [];

    $result['first const'] = MyFirstInterface::FIRST_CONST;
    $result['second const'] = MySecondInterface::SECOND_CONST;

    return $result;
}
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'first const': 'second value',
            'second const': 'first value'
        });
    });
});
