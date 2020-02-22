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

describe('PHP "const" declaration statement integration', function () {
    it('should allow defining constants outside of any namespace', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

const MY_CONST = 1001;

$result = [];
$result[] = MY_CONST;

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            1001
        ]);
    });

    it('should allow defining constants inside a namespace', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff {
    const MY_CONST = 21;
}

namespace {
    $result = [];
    $result[] = My\Stuff\MY_CONST;

    return $result;
}
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21
        ]);
    });

    it('should allow defining a constant when a case-sensitive but different-case matching constant already exists', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff {
    const my_const = 101;

    return my_const;
}
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();
        engine.defineConstant('My\\Stuff\\MY_CONST', 21, {caseInsensitive: false});

        expect(engine.execute().getNative()).to.equal(101);
    });

    it('should raise a notice when attempting to redefine a case-insensitive constant using different case', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff;

ini_set('error_reporting', E_ALL);

const my_const = 101;

return my_const;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/your_module.php', php),
            engine = module();
        engine.defineConstant('My\\Stuff\\MY_CONST', 21, {caseInsensitive: true});

        // Constant should retain its original value and not be redefined
        expect(engine.execute().getNative()).to.equal(21);
        expect(engine.getStderr().readAll()).to.equal(
            // NB: Namespace prefix should intentionally be lowercased
            'PHP Notice:  Constant my\\stuff\\MY_CONST already defined in /path/to/your_module.php on line 7\n'
        );
    });

    it('should raise a notice when attempting to redefine a constant with same case', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff;

ini_set('error_reporting', E_ALL);

const THING = 21;
const THING = 101; // Attempt to redefine the constant

return THING;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module();

        // Constant should retain its original value and not be redefined
        expect(engine.execute().getNative()).to.equal(21);
        expect(engine.getStderr().readAll()).to.equal(
            // NB: Namespace prefix should intentionally be lowercased
            'PHP Notice:  Constant my\\stuff\\THING already defined in /path/to/my_module.php on line 8\n'
        );
    });
});
