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

describe('PHP "global" import statement integration', function () {
    it('should import the global for future references', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myVar = 'original value';

function myImporter()
{
    global $myVar;

    $myVar = 'modified value';
}

myImporter();

return $myVar;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal('modified value');
    });

    it('should not import the global before the statement has executed', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myVar = 'original value';

function myImporter()
{
    $myVar = 'modified value';

    global $myVar;
}

myImporter();

return $myVar;
EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.equal('original value');
    });

    it('should support unnecessary global variables in the global scope', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

global $myVar;
$myVar = 21;

$result = [];
$result[] = $myVar++;
$result[] = $myVar++;

return $result;

EOS
*/;}),//jshint ignore:line
            module = tools.syncTranspile(null, php);

        expect(module().execute().getNative()).to.deep.equal([
            21,
            22
        ]);
    });
});
