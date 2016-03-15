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
}

class SecondPHPClass extends NonCoercingJSClass
{
}

$first = new FirstPHPClass();
$second = new SecondPHPClass();

return $first->addOneTo(10) + $second->addThreeTo(7);
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
                    function CoercingJSClass() {
                    }

                    CoercingJSClass.prototype.addOneTo = function (number) {
                        return number + 1;
                    };

                    return CoercingJSClass;
                },
                'NonCoercingJSClass': function (internals) {
                    function NonCoercingJSClass() {
                    }

                    NonCoercingJSClass.prototype.addThreeTo = function (numberValue) {
                        return internals.valueFactory.createInteger(numberValue.getNative() + 3);
                    };

                    internals.disableAutoCoercion();

                    return NonCoercingJSClass;
                }
            }
        });

        expect(module().execute().getNative()).to.equal(21);
    });
});
