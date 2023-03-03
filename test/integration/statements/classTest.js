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

describe('PHP "class" statement integration', function () {
    it('should support extending JS classes with auto-coercion both on and off', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
class FirstPHPClass extends CoercingJSClass
{
    public function __construct($base)
    {
        CoercingJSClass::__construct($base . ' php_ctor');
    }
}

class SecondPHPClass extends NonCoercingJSClass
{
}

$first = new FirstPHPClass('php_init1');
$second = new SecondPHPClass('php_init2');

return $first->addOneTo(' php_10') . ' op ' . $second->addThreeTo(' php_7');
EOS
*/;}),//jshint ignore:line
            environment = tools.createAsyncEnvironment({}, [
                {
                    classes: {
                        'CoercingJSClass': function (internals) {
                            function CoercingJSClass(base) {
                                this.base = this.shadow + ' '  + base + ' js_ctor1';
                            }

                            internals.defineShadowConstructor(function () {
                                this.shadow = 'shadow_coerce';
                            });

                            CoercingJSClass.prototype.__construct = function () {
                                this.base += ' magic_coerce';
                            };

                            CoercingJSClass.prototype.addOneTo = function (string) {
                                return this.base + string + ' one';
                            };

                            return CoercingJSClass;
                        },
                        'NonCoercingJSClass': function (internals) {
                            function NonCoercingJSClass(baseValue) {
                                this.setProperty(
                                    'base',
                                    internals.valueFactory.createString(
                                        this.getProperty('shadow').getNative() + ' ' + baseValue.getNative() + ' js_ctor2'
                                    )
                                );
                            }

                            internals.defineShadowConstructor(function () {
                                // Shadow constructor will be called before the real one
                                this.setProperty('shadow', internals.valueFactory.createString('shadow_non_coerce'));
                            });

                            NonCoercingJSClass.prototype.__construct = function () {
                                this.setProperty(
                                    'base',
                                    internals.valueFactory.createString(
                                        this.getProperty('base').getNative() + ' magic_non_coerce'
                                    )
                                );
                            };

                            NonCoercingJSClass.prototype.addThreeTo = function (stringValue) {
                                return internals.valueFactory.createString(
                                    this.getProperty('base').getNative() + stringValue.getNative() + ' three'
                                );
                            };

                            internals.disableAutoCoercion();

                            return NonCoercingJSClass;
                        }
                    }
                }
            ]),
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module({}, environment);

        expect((await engine.execute()).getNative()).to.equal(
            'shadow_coerce php_init1 php_ctor js_ctor1 magic_coerce php_10 one op shadow_non_coerce php_init2 js_ctor2 magic_non_coerce php_7 three'
        );
    });

    it('should raise a fatal error when attempting to define a class with a name already used by a class', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
namespace My\Stuff;

class MyClass {}

class MyClass {}
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/module.php', php),
            engine = module();

        await expect(engine.execute()).to.eventually.be.rejectedWith(
            PHPFatalError,
            'PHP Fatal error: Cannot declare class My\\Stuff\\MyClass, because the name is already in use in /path/to/module.php on line 6'
        );
    });
});
