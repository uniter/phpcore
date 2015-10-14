/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var splFunctions = require('./functions/spl'),
    stdClass = require('./classes/stdClass'),
    Closure = require('./classes/Closure'),
    Exception = require('./classes/Exception'),
    JSObject = require('./classes/JSObject');

module.exports = {
    classes: {
        'stdClass': stdClass,
        'Closure': Closure,
        'Exception': Exception,
        'JSObject': JSObject
    },
    constantGroups: [],
    functionGroups: [
        splFunctions
    ]
};
