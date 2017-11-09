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

describe('PHP ternary expression integration', function () {
    it('should support basic ternary operator expressions', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myTruthyVar = 1;

$result = [];
$result[] = 21 ? 10 : 12;
$result[] = 0 ? 'yep, truthy' : 'nope, falsy';
$result[] = $myTruthyVar ? 'yes' : 'no';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            10,
            'nope, falsy',
            'yes'
        ]);
    });

    it('should support shorthand ternary operator expressions', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = 21 ?: 12;
$result[] = 1 === 2 ?: 37;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            21,
            37
        ]);
    });

    it('should support nested ternary operator expressions', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$result = [];
$result[] = 0 ?: false ?: 30;
$result[] = 1 ?: 21 ?: 30;

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            30,
            1
        ]);
    });
});
