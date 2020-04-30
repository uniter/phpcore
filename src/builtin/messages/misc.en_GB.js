/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

/*
 * Miscellaneous translations
 */
module.exports = {
    'en_GB': {
        'core': {
            // For uncaught errors (see ErrorReporting)
            'error_with_context_and_trace': ' in ${filePath}:${line}\n' +
                'Stack trace:' + '\n' +
                '${formattedTrace}\n' +
                '  thrown in ${filePath} on line ${line}',
            'error_without_context_but_with_trace': '\n' +
                'Stack trace:' + '\n' +
                '${formattedTrace}\n' +
                '  thrown in ${filePath} on line ${line}',

            // For warnings/notices/uncatchable errors etc.
            'error_without_trace': ' in ${filePath} on line ${line}',

            // The path used in stack traces etc. for eval'd code
            'eval_path': '${path}(${lineNumber}) : eval()\'d code',

            // Used for building messages referencing types
            'instance_of_type_expected': 'an instance of ${expectedType}',
            'instance_of_type_actual': 'instance of ${actualType}',
            'of_generic_type_expected': 'of the type ${expectedType}',

            // For any type of error that needs to be scoped to the current function
            'scoped_error': '${function}(): ${message}',

            // For unknown file paths, line numbers etc.
            'unknown': 'unknown'
        }
    }
};
