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
    require('./interfaces/ArrayAccess'),
    require('./classes/Closure'),
    require('./classes/Exception'),
    require('./interfaces/Iterator'),
    require('./interfaces/IteratorAggregate'),
    require('./classes/JSObject'),
    require('./interfaces/Traversable')
], function (
    reservedConstants,
    splFunctions,
    stdClass,
    ArrayAccess,
    Closure,
    Exception,
    Iterator,
    IteratorAggregate,
    JSObject,
    Traversable
) {
    return {
        classes: {
            'stdClass': stdClass,
            'ArrayAccess': ArrayAccess,
            'Closure': Closure,
            'Exception': Exception,
            'Iterator': Iterator,
            'IteratorAggregate': IteratorAggregate,
            'JSObject': JSObject,
            'Traversable': Traversable
        },
        constantGroups: [
            reservedConstants
        ],
        functionGroups: [
            splFunctions
        ]
    };
}, {strict: true});
