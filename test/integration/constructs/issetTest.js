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

describe('PHP isset(...) construct integration', function () {
    it('should correctly handle accessing undefined variables, elements and properties', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$object = new stdClass;

$result = [];
$result[] = isset($aRandomVar);
$result[] = isset($result['aRandomElement']);
$result[] = isset($object->aProp);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            false,
            false,
            false
        ]);
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should not suppress errors from a function called inside isset(...) construct', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

function myFunc() {
    return $anotherUndefVar;
}

$result = isset($undefVar[myFunc()]);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.be.false;
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice: Undefined variable: anotherUndefVar

EOS
*/;}) //jshint ignore:line
        );
    });
});
