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

describe('PHP namespace (backslash-delimited) construct integration', function () {
    it('should allow the special namespace keyword to resolve to the current namespace, regardless of "use" imports', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace Your\Stuff {
    class SomeClass {
        const SOME_THING = 'your thing!';
    }
}

namespace My\Stuff {
    class SomeClass {
        const SOME_THING = 'my thing!';
    }
}

// In a new namespace scope
namespace My {
    use Your\Stuff;

    $result = [];
    $result['taking use statements into account'] = Stuff\SomeClass::SOME_THING;
    $result['explicitly current namespace-relative'] = namespace\Stuff\SomeClass::SOME_THING;
    $result['explicitly current namespace-relative, mixed case keyword'] = naMEsPaCe\Stuff\SomeClass::SOME_THING;

    return $result;
}

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'taking use statements into account': 'your thing!',
            'explicitly current namespace-relative': 'my thing!',
            'explicitly current namespace-relative, mixed case keyword': 'my thing!'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
