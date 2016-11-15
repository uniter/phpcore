/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var asyncPHPCore = require('../../async'),
    phpToAST = require('phptoast'),
    phpToJS = require('phptojs'),
    syncPHPCore = require('../../sync'),
    transpile = function (path, php, phpCore, options) {
        var js,
            phpParser;

        options = options || {};

        phpParser = phpToAST.create(null, options.phpToAST);

        if (path) {
            phpParser.getState().setPath(path);
        }

        js = phpToJS.transpile(phpParser.parse(php), options.phpToJS);

        return new Function(
            'require',
            'return ' + js
        )(function () {
            return phpCore;
        });
    };

module.exports = {
    asyncTranspile: function (path, php, options) {
        return transpile(path, php, asyncPHPCore, options);
    },

    syncTranspile: function (path, php, options) {
        return transpile(path, php, syncPHPCore, options);
    }
};
