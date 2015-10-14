/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('lodash');

function INIState() {
    this.settings = {
        'include_path': '.'
    };
}

_.extend(INIState.prototype, {
    get: function (name) {
        return this.settings[name];
    },

    set: function (name, value) {
        this.settings[name] = value;
    }
});

module.exports = INIState;
