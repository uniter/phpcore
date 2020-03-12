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

describe('PHP "ini_get" builtin function integration', function () {
    beforeEach(function () {
        // Create an isolated runtime so we don't affect the singleton instance
        this.runtime = tools.createSyncRuntime();
    });

    it('should fetch the default value of an INI option when it has not been changed at runtime', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php
return [
    ini_get('display_errors'),
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
                        'my_custom_ini_setting': 1001
                    };
                }
            ]
        });
        engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            true, // display_errors
            1001  // my_custom_ini_setting (just for the purposes of this test)
        ]);
    });

    it('should fetch the current value of an INI option when it has been changed at runtime', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

ini_set('my_custom_ini_setting', 9999);

return [
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
                        'my_custom_ini_setting': 101 // Should be modified by the ini_set(...) call from PHP-land
                    };
                }
            ]
        });
        engine = module();

        expect(engine.execute().getNative()).to.deep.equal([
            9999 // Modified my_custom_ini_setting
        ]);
    });

    it('should return bool(false) for an undefined INI option', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

return [
    ini_get('some_undefined_ini_setting')
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
