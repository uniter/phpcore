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

describe('PHP trait composition integration', function () {
    it('should support traits using other traits', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

class MyClass {
    use MyFirstTrait;

    public $myClassProp = 'from my class prop';

    public function myClassMethod(): string {
        return 'from my class method';
    }
}

trait MyFirstTrait {
    use MySecondTrait;

    public $myFirstTraitProp = 'from my first trait prop';

    public function myFirstTraitMethod(): string {
        return 'from my first trait method';
    }
}

trait MySecondTrait {
    public $mySecondTraitProp = 'from my second trait prop';

    public function mySecondTraitMethod(): string {
        return 'from my second trait method';
    }
}

$myObject = new MyClass;
$result = [];

$result['->myClassProp'] = $myObject->myClassProp;
$result['->myClassMethod()'] = $myObject->myClassMethod();
$result['->myFirstTraitProp'] = $myObject->myFirstTraitProp;
$result['->myFirstTraitMethod()'] = $myObject->myFirstTraitMethod();
$result['->mySecondTraitProp'] = $myObject->mySecondTraitProp;
$result['->mySecondTraitMethod()'] = $myObject->mySecondTraitMethod();

return $result;
EOS
*/;}),//jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        expect((await engine.execute()).getNative()).to.deep.equal({
            '->myClassProp': 'from my class prop',
            '->myClassMethod()': 'from my class method',
            '->myFirstTraitProp': 'from my first trait prop',
            '->myFirstTraitMethod()': 'from my first trait method',
            '->mySecondTraitProp': 'from my second trait prop',
            '->mySecondTraitMethod()': 'from my second trait method'
        });
        expect(engine.getStderr().readAll()).to.equal('');
    });

    it('should raise a fatal error when a used trait cannot be found', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

trait MyTrait {
    use MyUndefinedTrait;
}

EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Uncaught Error: Trait \'MyUndefinedTrait\' not found in /path/to/my_module.php on line 3'
        );
    });
});
