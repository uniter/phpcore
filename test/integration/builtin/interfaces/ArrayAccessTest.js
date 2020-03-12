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
    tools = require('../../tools');

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
        return $offset === 2 || $offset === 'get null';
    }
    public function offsetGet($offset)
    {
        if ($offset === 21) {
            return 'found 21';
        }

        if ($offset === 'get null') {
            return null;
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
$result['isset(offset that exists)'] = isset($object[2]); // Should be true
$result['isset(offset that doesn\'t exist)'] = isset($object[1]); // Should be false
$result['offset with value'] = $object[21]; // Should be "found 21"
$result['offset without value'] = $object[27]; // Should be "not found"
$result['isset(offset that returns null)'] = isset($object['get null']); // Should be false as null is not "set"
$object['an index'] = 'yep'; // Assignment
$result['read of last set offset'] = $object->lastSetOffset; // Should be "an index"
$result['read of last set value'] = $object->lastSetValue;
unset($object['my unset key']);
$result['read of last unset offset'] = $object->unsetOffset;

return $result;
EOS
*/;}),//jshint ignore:line,
            module = tools.syncTranspile('/path/to/my_module.php', php),
            engine = module(),
            result = engine.execute();

        expect(engine.getStderr().readAll()).to.equal('');
        expect(result.getNative()).to.deep.equal({
            'isset(offset that exists)': true,
            'isset(offset that doesn\'t exist)': false,
            'offset with value': 'found 21',
            'offset without value': 'not found',
            'isset(offset that returns null)': false,
            'read of last set offset': 'an index',
            'read of last set value': 'yep',
            'read of last unset offset': 'my unset key'
        });
    });
});
