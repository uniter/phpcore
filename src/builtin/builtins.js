/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('./constants/reserved'),
    require('./functions/spl'),
    require('./classes/stdClass'),
    require('./classes/Closure'),
    require('./classes/Exception'),
    require('./classes/JSObject')
], function (
    reservedConstants,
    splFunctions,
    stdClass,
    Closure,
    Exception,
    JSObject
) {
    return {
        classes: {
            'stdClass': stdClass,
            'Closure': Closure,
            'Exception': Exception,
            'JSObject': JSObject
        },
        constantGroups: [
            reservedConstants
        ],
        functionGroups: [
            splFunctions
        ]
    };
}, {strict: true});
