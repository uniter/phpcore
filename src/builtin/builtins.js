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
    require('./functions/optionsAndInfo/config'),
    require('./constants/errorHandling'),
    require('./ini/errorHandling'),
    require('./messages/error.en_GB'),
    require('./messages/misc.en_GB'),
    require('./messages/notice.en_GB'),
    require('./constants/reserved'),
    require('./functions/spl'),
    require('./classes/stdClass'),
    require('./classes/Error/ArgumentCountError'),
    require('./interfaces/ArrayAccess'),
    require('./classes/Closure'),
    require('./classes/Error/CompileError'),
    require('./classes/Error'),
    require('./classes/Exception'),
    require('./interfaces/Iterator'),
    require('./interfaces/IteratorAggregate'),
    require('./classes/JSObject'),
    require('./classes/Error/ParseError'),
    require('./interfaces/Throwable'),
    require('./interfaces/Traversable'),
    require('./classes/Error/TypeError')
], function (
    configOptionsAndInfoFunctions,
    errorHandlingConstants,
    errorHandlingDefaultINIOptions,
    errorMessages,
    miscellaneousMessages,
    noticeMessages,
    reservedConstants,
    splFunctions,
    stdClass,
    ArgumentCountError,
    ArrayAccess,
    Closure,
    CompileError,
    Error,
    Exception,
    Iterator,
    IteratorAggregate,
    JSObject,
    ParseError,
    Throwable,
    Traversable,
    TypeError
) {
    return {
        classes: [
            {'stdClass': stdClass},
            {'ArrayAccess': ArrayAccess},
            {'Closure': Closure},
            {'Throwable': Throwable},
            {'Error': Error},
            {'CompileError': CompileError},
            {'ParseError': ParseError},
            {'TypeError': TypeError},
            {'ArgumentCountError': ArgumentCountError},
            {'Exception': Exception},
            {'Iterator': Iterator},
            {'IteratorAggregate': IteratorAggregate},
            {'JSObject': JSObject},
            {'Traversable': Traversable}
        ],
        constantGroups: [
            errorHandlingConstants,
            reservedConstants
        ],
        functionGroups: [
            configOptionsAndInfoFunctions,
            splFunctions
        ],
        defaultINIGroups: [
            errorHandlingDefaultINIOptions
        ],
        translationCatalogues: [
            errorMessages,
            noticeMessages,
            miscellaneousMessages
        ]
    };
}, {strict: true});
