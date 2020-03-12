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

describe('PHP error control @(...) operator integration', function () {
    it('should suppress errors in the current scope and any sub-call scopes', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
ini_set('error_reporting', E_ALL); // Notices are hidden by default

function badFunc() {
    print $myUndefVar; // Should raise a notice
    return 21;
}
function goodFunc($msg) {
    return 22;
}
function returnIt($it) {
    return $it;
}
function badFunc2() {
    return returnIt($anUndefVar);
}

$result = [];
$result[] = @$anUnsetVar;
@$result[] = $anotherUnsetVar;
$result[] = @badFunc();
$result[] = goodFunc(@$andAnotherUnsetVar);
$result[] = $undefVarWithNoSuppression;
$result[] = @badFunc2();

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/some/module.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            null,
            null,
            21,
            22,
            null,
            null
        ]);
        // Only the unsuppressed expression should be able to raise an error
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice:  Undefined variable: undefVarWithNoSuppression in /some/module.php on line 23

EOS
*/;}) //jshint ignore:line
        );
    });
});
