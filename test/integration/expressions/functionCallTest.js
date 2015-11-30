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

describe('PHP synchronous function call integration', function () {
    it('should treat function names as case-insensitive', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace {
    function myFunc() {
        return 22;
    }
}

namespace My\App {
    function anotherFunc() {
        return 23;
    }
}

namespace {
    use MY\APP as myapp; // Alias and ref'd class path should be case-insensitive too

    return [
        myfUNC(),
        myApP\ANOTHERfunc()
    ];
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            22,
            23
        ]);
    });
});
