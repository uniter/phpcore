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
    tools = require('./tools');

describe('Custom plugin integration', function () {
    beforeEach(function () {
        this.runtime = tools.createSyncRuntime();
    });

    it('should support installing a plugin with a binding', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return get_my_value();
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php),
            engine;

        this.runtime.install({
            bindingGroups: [
                function () {
                    return {
                        'my_binding': function (bindingOptions) {
                            return bindingOptions.my_option;
                        }
                    };
                }
            ],
            functionGroups: [
                function (internals) {
                    return {
                        'get_my_value': function () {
                            return internals.valueFactory.coerce(internals.getBinding('my_binding'));
                        }
                    };
                }
            ]
        });

        engine = module({
            my_binding: {
                my_option: 21
            }
        });

        expect(engine.execute().getNative()).to.equal(21);
    });
});
