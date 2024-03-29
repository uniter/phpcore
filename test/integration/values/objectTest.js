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
    phpCommon = require('phpcommon'),
    tools = require('../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP object value integration', function () {
    it('should correctly coerce instances of classes implementing ->__toString()', async function () {
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
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            'when explicitly cast to string': 'my string representation with: my value',
            'when implicitly cast to string via concatenation': 'my string representation with: my value (and then some)'
        });
    });

    it('should raise an error when attempting to coerce instances of classes not implementing ->__toString', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass
{
}

$myObject = new MyClass;

$result = [];

$result['my object as string'] = (string)$myObject; // This should raise an error.

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'Fatal error: Uncaught Error: Object of class MyClass could not be converted to string in /path/to/my_module.php on line 11'
        );
    });
});
