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

function myFunc() {
    print $myUndefVar; // Should raise a notice
    return 21;
}

$result = [];
$result[] = @$anUnsetVar;
@$result[] = $anotherUnsetVar;
$result[] = @myFunc();
$result[] = $undefVarWithNoSuppression;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            null,
            null,
            21,
            null
        ]);
        // Only the unsuppressed expression should be able to raise an error
        expect(engine.getStderr().readAll()).to.equal(
            nowdoc(function () {/*<<<EOS
PHP Notice: Undefined variable: undefVarWithNoSuppression

EOS
*/;}) //jshint ignore:line
        );
    });
});
