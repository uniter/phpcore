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
    tools = require('../../../tools');

describe('PHP "ini_set" builtin function integration', function () {
    beforeEach(function () {
        // Create an isolated runtime so we don't affect the singleton instance
        this.runtime = tools.createSyncRuntime();
    });

    it('should return the old value for the setting', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return [
    ini_set('my_custom_ini_setting', 1000),
    ini_get('my_custom_ini_setting')
];
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php),
            engine;

        this.runtime.install({
            defaultINIGroups: [
                function () {
                    return {
                        'my_custom_ini_setting': 99
                    };
                }
            ]
        });
        engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            99,  // Old value for my_custom_ini_setting
            1000 // New value for my_custom_ini_setting
        ]);
    });

    it('should return bool(false) when attempting to set the value of an undefined INI option', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    ini_set('some_undefined_ini_setting', 1000)
];
EOS
*/;}), //jshint ignore:line
            module = tools.transpile(this.runtime, null, php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            false // "some_undefined_ini_setting" should not be defined
        ]);
    });
});
