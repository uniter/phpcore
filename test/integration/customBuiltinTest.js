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
    pausable = require('pausable'),
    phpCommon = require('phpcommon'),
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    when = require('../when'),
    Engine = require('../../src/Engine'),
    Environment = require('../../src/Environment'),
    OptionSet = require('../../src/OptionSet'),
    PHPState = require('../../src/PHPState').sync(),
    Runtime = require('../../src/Runtime').async(pausable);

describe('Custom builtin integration', function () {
    beforeEach(function () {
        this.runtime = new Runtime(
            Environment,
            Engine,
            OptionSet,
            PHPState,
            phpCommon,
            pausable,
            phpToAST,
            phpToJS
        );
    });

    it('should support installing a custom function', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21);
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return this.runtime;
            }.bind(this));

        this.runtime.install({
            functionGroups: [
                function (internals) {
                    return {
                        'add_one_to': function (argReference) {
                            return internals.valueFactory.createInteger(argReference.getNative() + 1);
                        }
                    };
                }
            ]
        });

        module().execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(22);
        }), done);
    });

    it('should support installing a custom class', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new AwesomeClass();

return $myObject->getIt();
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return this.runtime;
            }.bind(this));

        this.runtime.install({
            classes: {
                'AwesomeClass': function () {
                    function AwesomeClass() {}

                    AwesomeClass.prototype.getIt = function () {
                        return 21;
                    };

                    return AwesomeClass;
                }
            }
        });

        module().execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(21);
        }), done);
    });

    it('should support installing custom classes with unwrappers', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myCoercingObject = new CoercingClass(27);
$myNonCoercingObject = new NonCoercingClass(21);

return [$myCoercingObject, $myNonCoercingObject];
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return this.runtime;
            }.bind(this));

        this.runtime.install({
            classes: {
                'CoercingClass': function (internals) {
                    function CoercingClass(myNumber) {
                        this.myNumber = myNumber;
                    }

                    internals.defineUnwrapper(function () {
                        return this.myNumber + 3;
                    });

                    return CoercingClass;
                },
                'NonCoercingClass': function (internals) {
                    function NonCoercingClass(myNumberValue) {
                        this.setProperty('myNumber', myNumberValue);
                    }

                    internals.defineUnwrapper(function () {
                        return this.getProperty('myNumber').getNative() * 2;
                    });

                    internals.disableAutoCoercion();

                    return NonCoercingClass;
                }
            }
        });

        module().execute().then(when(done, function (result) {
            expect(result.getNative()).to.deep.equal([30, 42]);
        }), done);
    });

    it('should support installing a custom class into a namespace', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new My\Stuff\AwesomeClass();

return $myObject->getIt();
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return this.runtime;
            }.bind(this));

        this.runtime.install({
            classes: {
                'My\\Stuff\\AwesomeClass': function () {
                    function AwesomeClass() {}

                    AwesomeClass.prototype.getIt = function () {
                        return 21;
                    };

                    return AwesomeClass;
                }
            }
        });

        module().execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(21);
        }), done);
    });

    it('should support installing a custom constant', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return MY_CONSTANT;
EOS
*/;}), //jshint ignore:line
            js = phpToJS.transpile(phpToAST.create().parse(php)),
            module = new Function(
                'require',
                'return ' + js
            )(function () {
                return this.runtime;
            }.bind(this));

        this.runtime.install({
            constantGroups: [
                function () {
                    return {
                        'MY_CONSTANT': 1024
                    };
                }
            ]
        });

        module().execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(1024);
        }), done);
    });
});
