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
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    Engine = require('../../../src/Engine'),
    Environment = require('../../../src/Environment'),
    Runtime = require('../../../src/Runtime').sync();

describe('PHP "class" statement integration', function () {
    beforeEach(function () {
        this.runtime = new Runtime(Environment, Engine, phpCommon, null, phpToAST, phpToJS);
    });

    it('should support extending JS classes with auto-coercion both on and off', function () {
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
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return this.runtime;
            }.bind(this));

        this.runtime.install({
            classes: {
                'CoercingJSClass': function () {
                    function CoercingJSClass(base) {
                        this.base = base + ' js_ctor1';
                    }

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
                            internals.valueFactory.createString(baseValue.getNative() + ' js_ctor2')
                        );
                    }

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
        });

        expect(module().execute().getNative()).to.equal(
            'php_init1 php_ctor js_ctor1 magic_coerce php_10 one op php_init2 js_ctor2 magic_non_coerce php_7 three'
        );
    });
});
