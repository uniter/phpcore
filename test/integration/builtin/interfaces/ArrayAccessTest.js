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
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    syncPhpCore = require('../../../../sync');

describe('PHP builtin ArrayAccess interface integration', function () {
    it('should support accessing an object with the array access syntax', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class MyStuff implements ArrayAccess
{
    public $lastSetOffset = null;
    public $lastSetValue = null;
    public $unsetOffset = null;

    public function offsetExists($offset)
    {
        return $offset === 2;
    }
    public function offsetGet($offset)
    {
        if ($offset === 21) {
            return 'found 21';
        }

        return 'not found';
    }
    public function offsetSet($offset, $value)
    {
        $this->lastSetOffset = $offset;
        $this->lastSetValue = $value;
    }
    public function offsetUnset($offset)
    {
        $this->unsetOffset = $offset;
    }
}

$result = [];
$object = new MyStuff();
$result[] = isset($object[2]); // Should be true
$result[] = isset($object[1]); // Should be false
$result[] = $object[21]; // Should be "found 21"
$result[] = $object[27]; // Should be "not found"
$object['an index'] = 'yep';
$result[] = $object->lastSetOffset; // Should be "an index"
$result[] = $object->lastSetValue;
unset($object['my unset key']);
$result[] = $object->unsetOffset;

return $result;
EOS
*/;}),//jshint ignore:line,
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return syncPhpCore;
            }),
            engine = module(),
            result = engine.execute();

        expect(engine.getStderr().readAll()).to.equal('');
        expect(result.getNative()).to.deep.equal([
            true,
            false,
            'found 21',
            'not found',
            'an index',
            'yep',
            'my unset key'
        ]);
    });
});
