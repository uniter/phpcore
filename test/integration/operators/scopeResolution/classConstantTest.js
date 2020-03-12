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
    tools = require('../../tools'),
    PHPFatalError = phpCommon.PHPFatalError;

describe('PHP class constant scope resolution "::" integration', function () {
    it('should allow class constants to be fetched using various methods of dereference', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

namespace My\Stuff {
    class MyFirstClass {
        const MY_CONST = 123;
    }
}

namespace Your\Stuff {
    use My\Stuff\MyFirstClass;

    $myUnprefixedClassName = 'My\Stuff\MyFirstClass';
    $myPrefixedClassName = '\My\Stuff\MyFirstClass';

    $result = [
        MyFirstClass::MY_CONST,
        \My\Stuff\MyFirstClass::MY_CONST,
        $myUnprefixedClassName::MY_CONST,
        $myPrefixedClassName::MY_CONST
    ];

    return $result;
}
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile(null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            123, // With unprefixed class name
            123, // With fully-qualified class name
            123, // With class name in variable, without leading slash
            123  // With class name in variable, with leading slash
        ]);
    });

    // TODO: The line number should actually be that of the constant name itself - at the moment
    //       the line number of the statement will always be given. It is rare to split constant dereferences
    //       across multiple lines, though
    it('should raise a fatal error when attempting to access an undefined constant of a class', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyFirstClass {}

return MyFirstClass::MY_UNDEFINED_CONST;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Undefined class constant \'MY_UNDEFINED_CONST\' in my_module.php on line 5'
        );
    });

    it('should raise a fatal error on attempting to fetch a class constant of an integer', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$myInt = 27;

$dummy = $myInt::MY_CONST;

EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('my_module.php', php),
            engine = module();

        expect(function () {
            engine.execute();
        }.bind(this)).to.throw(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Class name must be a valid object or a string in my_module.php on line 5'
        );
    });
});
