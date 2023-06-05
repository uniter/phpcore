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
    require('./services/base'),
    require('./opcodes/calculation'),
    require('./functions/optionsAndInfo/config'),
    require('./opcodes/controlExpression'),
    require('./opcodes/controlStructure'),
    require('./constants/errorHandling'),
    require('./ini/errorHandling'),
    require('./messages/error.en_GB'),
    require('./opcodes/instrumentation'),
    require('./opcodes/loopStructure'),
    require('./messages/misc.en_GB'),
    require('./messages/notice.en_GB'),
    require('./constants/reserved'),
    require('./ini/resource'),
    require('./services/semantics'),
    require('./functions/spl'),
    require('./classes/stdClass'),
    require('./messages/warning.en_GB'),
    require('./classes/Error/ArgumentCountError'),
    require('./interfaces/ArrayAccess'),
    require('./classes/Closure'),
    require('./classes/Error/CompileError'),
    require('./classes/Error'),
    require('./classes/Exception'),
    require('./classes/Generator'),
    require('./interfaces/Iterator'),
    require('./interfaces/IteratorAggregate'),
    require('./classes/JSArray'),
    require('./classes/JSObject'),
    require('./classes/Error/ParseError'),
    require('./interfaces/Throwable'),
    require('./interfaces/Traversable'),
    require('./classes/Error/TypeError')
], function (
    baseServiceGroup,
    calculationOpcodeGroup,
    configOptionsAndInfoFunctions,
    controlExpressionOpcodeGroup,
    controlStructureOpcodeGroup,
    errorHandlingConstants,
    errorHandlingDefaultINIOptions,
    errorMessages,
    instrumentationOpcodeGroup,
    loopStructureOpcodeGroup,
    miscellaneousMessages,
    noticeMessages,
    reservedConstants,
    resourceDefaultINIOptions,
    semanticsServiceGroup,
    splFunctions,
    stdClass,
    warningMessages,
    ArgumentCountError,
    ArrayAccess,
    Closure,
    CompileError,
    Error,
    Exception,
    Generator,
    Iterator,
    IteratorAggregate,
    JSArray,
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
            {'Traversable': Traversable},
            {'Iterator': Iterator},
            {'IteratorAggregate': IteratorAggregate},
            {'Generator': Generator},
            {'JSArray': JSArray},
            {'JSObject': JSObject}
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
            errorHandlingDefaultINIOptions,
            resourceDefaultINIOptions
        ],
        opcodeGroups: [
            calculationOpcodeGroup,
            controlExpressionOpcodeGroup,
            controlStructureOpcodeGroup,
            instrumentationOpcodeGroup,
            loopStructureOpcodeGroup
        ],
        serviceGroups: [
            baseServiceGroup,
            semanticsServiceGroup
        ],
        translationCatalogues: [
            errorMessages,
            noticeMessages,
            miscellaneousMessages,
            warningMessages
        ]
    };
}, {strict: true});
