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
    tools = require('./tools'),
    when = require('../when');

describe('Custom builtin integration', function () {
    beforeEach(function () {
        this.runtime = tools.createAsyncRuntime();
    });

    it('should support installing a custom function', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
return add_one_to(21);
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php);

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

    it('should support installing a custom class using the "classes" property', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new AwesomeClass();

return $myObject->getIt();
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php);

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

    it('should support installing a custom class using the "classGroups" property', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new AwesomeClass();

return $myObject->getIt();
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php);

        this.runtime.install({
            classGroups: [
                function () {
                    return {
                        'AwesomeClass': function () {
                            function AwesomeClass() {}

                            AwesomeClass.prototype.getIt = function () {
                                return 21;
                            };

                            return AwesomeClass;
                        }
                    };
                }
            ]
        });

        module().execute().then(when(done, function (result) {
            expect(result.getNative()).to.equal(21);
        }), done);
    });

    it('should define classes from the "classGroups" property in sequence to support dependencies', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myObject = new SecondClass(5);

return [
    $myObject->getFirst(),
    $myObject->getSecond()
];
EOS
*/;}), //jshint ignore:line
            runtime = tools.createSyncRuntime(),
            module = tools.transpile(runtime, null, php);

        runtime.install({
            classGroups: [
                function () {
                    return {
                        'FirstClass': function () {
                            function FirstClass(toAdd) {
                                this.toAdd = toAdd;
                            }

                            FirstClass.prototype.getFirst = function () {
                                return 21 + this.toAdd;
                            };

                            return FirstClass;
                        }
                    };
                },
                function () {
                    return {
                        'SecondClass': function (internals) {
                            function SecondClass() {
                                internals.callSuperConstructor(this, arguments);
                            }

                            internals.extendClass('FirstClass');

                            SecondClass.prototype.getSecond = function () {
                                return 1001 + this.toAdd;
                            };

                            return SecondClass;
                        }
                    };
                }
            ]
        });

        expect(module().execute().getNative()).to.deep.equal([26, 1006]);
    });

    it('should support configuring default options', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return get_my_option();
EOS
*/;}), //jshint ignore:line
            runtime = tools.createSyncRuntime(),
            module = tools.transpile(runtime, null, php);

        runtime.configure({
            'my_option': 21
        });
        runtime.install({
            functionGroups: [
                function (internals) {
                    return {
                        'get_my_option': function () {
                            return internals.valueFactory.createInteger(
                                internals.optionSet.getOption('my_option')
                            );
                        }
                    };
                }
            ]
        });

        expect(module().execute().getNative()).to.equal(21);
    });

    it('should support installing custom classes with unwrappers', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
$myCoercingObject = new CoercingClass(27);
$myNonCoercingObject = new NonCoercingClass(21);

return [$myCoercingObject, $myNonCoercingObject];
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php);

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
            module = tools.transpile(this.runtime, null, php);

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
            module = tools.transpile(this.runtime, null, php);

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

    it('should support capturing stdout', function (done) {
        var php = nowdoc(function () {/*<<<EOS
<?php
print 'first' . PHP_EOL;

install_stdout_hook(); // The print above should not be captured

print 'second' . PHP_EOL;

print 'third' . PHP_EOL;
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php),
            log = [];

        this.runtime.install({
            functionGroups: [
                function (internals) {
                    return {
                        'install_stdout_hook': function () {
                            internals.stdout.on('data', function (data) {
                                log.push('stdout :: ' + data);
                            });
                        }
                    };
                }
            ]
        });

        module().execute().then(when(done, function () {
            expect(log).to.deep.equal([
                // Note that "first" is not captured, as the stdout hook
                // was not installed until after that print had run
                'stdout :: second\n',
                'stdout :: third\n'
            ]);
        }), done);
    });
});
