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

describe('PHP object value integration', function () {
    it('should correctly coerce instances of classes implementing __toString() in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
    private $myProp;

    public function __construct($myProp)
    {
        $this->myProp = $myProp;
    }

    // Define a magic method for controlling coercion to string
    public function __toString()
    {
        return 'my string representation with: ' . $this->myProp;
    }
}

$myObject = new MyClass('my value');

$result = [];

$result['when explicitly cast to string'] = (string)$myObject;
$result['when implicitly cast to string via concatenation'] = $myObject . ' (and then some)';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'when explicitly cast to string': 'my string representation with: my value',
            'when implicitly cast to string via concatenation': 'my string representation with: my value (and then some)'
        });
    });
});
