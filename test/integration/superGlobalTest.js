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

describe('PHP super global variable integration', function () {
    it('should support fetching super globals both inside and outside of functions', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function getItPlusOne() {
    return $MY_SUPER_GLOBAL + 1;
}

$result[] = $MY_SUPER_GLOBAL;
$result[] = getItPlusOne();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.defineSuperGlobal('MY_SUPER_GLOBAL', 21);

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            22
        ]);
    });

    it('should support assigning to super globals and storing the new value', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function addOneToIt() {
    $MY_SUPER_GLOBAL = $MY_SUPER_GLOBAL + 1;
}

$result[] = $MY_SUPER_GLOBAL;
addOneToIt();
$result[] = $MY_SUPER_GLOBAL;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        engine.defineSuperGlobal('MY_SUPER_GLOBAL', 30);

        expect(engine.execute().getNative()).to.deep.equal([
            30,
            31
        ]);
    });

    it('should support accessor superglobals', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function giveItFour() {
    $MY_MAGIC_SUPER_GLOBAL = 4;
}

$result[] = $MY_MAGIC_SUPER_GLOBAL;
giveItFour();
$result[] = $MY_MAGIC_SUPER_GLOBAL;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module(),
            theValue = 21;

        engine.defineSuperGlobalAccessor(
            'MY_MAGIC_SUPER_GLOBAL',
            function () {
                return theValue;
            },
            function (newValue) {
                theValue = newValue * 2;
            }
        );

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            8
        ]);
    });

    it('should support the standard superglobals', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myValue = 21;
$result[] = $GLOBALS['myValue'];

$result[] = $GLOBALS['GLOBALS']['myValue'];

$GLOBALS = 27;
$result[] = $GLOBALS;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21, // Ensure global variables can be accessed
            21, // $GLOBALS should have a reference to itself
            27  // Allow superglobals' values to be overwritten
        ]);
    });

    it('should support defining a new global via the superglobal $GLOBALS', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function setMyNewGlobal() {
    $GLOBALS['myNewGlobal'] = 21;
}

setMyNewGlobal();

$result = [];
$result[] = $myNewGlobal;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support modifying existing globals via the superglobal $GLOBALS', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myExistingGlobal = 'initial value';

function setMyExistingGlobal() {
    $GLOBALS['myExistingGlobal'] = 'new value';
}

$result = [];
$result[] = $myExistingGlobal;
setMyExistingGlobal();
$result[] = $myExistingGlobal;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'initial value',
            'new value'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support defining a new global as a reference via the superglobal $GLOBALS', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$GLOBALS['myNewRefGlobal'] =& $myNewRefedGlobal;
$myNewRefedGlobal = 21; // Change the ref'd global afterwards, to check both refer to the same storage

$result[] = $myNewRefGlobal;
$result[] = $myNewRefedGlobal;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            21
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support changing an existing global to be a reference via the superglobal $GLOBALS', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myExistingGlobal = 'old value';
$GLOBALS['myExistingGlobal'] =& $myNewRefedGlobal;
$myNewRefedGlobal = 'new value'; // Change the ref'd global afterwards, to check both refer to the same storage

$result[] = $myExistingGlobal;
$result[] = $myNewRefedGlobal;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            'new value', // The existing global should see the modification too
            'new value'
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should support deleting globals by unsetting via the superglobal $GLOBALS', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$myGlobal = 'mine';

$result[] = isset($myGlobal);
unset($GLOBALS['myGlobal']);
$result[] = isset($myGlobal);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            true,
            false
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });
});
