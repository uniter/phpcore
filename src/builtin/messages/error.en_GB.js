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
 * Translations for error-level error messages
 */
module.exports = {
    'en_GB': {
        'core': {
            'break_or_continue_in_wrong_context': '\'${type}\' not in the \'loop\' or \'switch\' context',
            'call_to_undefined_function': 'Call to undefined function ${name}()',
            'cannot_access_property': 'Cannot access ${visibility} property ${className}::$${propertyName}',
            'cannot_access_when_no_active_class': 'Cannot access ${className}:: when no class scope is active',
            'cannot_declare_class_as_name_already_in_use': 'Cannot declare class ${className} because the name is already in use',
            // NB: This translation is in fact different to the above, by a comma
            'cannot_redeclare_class_as_name_already_in_use': 'Cannot declare class ${className}, because the name is already in use',
            'cannot_implement_throwable': 'Class ${className} cannot implement interface Throwable, extend Exception or Error instead',
            'cannot_unset_static_property': 'Attempt to unset static property ${className}::$${propertyName}',
            'cannot_use_as_name_already_in_use': 'Cannot use ${source} as ${alias} because the name is already in use',
            'cannot_use_wrong_type_as': 'Cannot use object of type ${actual} as ${expected}',
            'class_name_not_valid': 'Class name must be a valid object or a string',
            'class_not_found': 'Class \'${name}\' not found',
            'function_name_must_be_string': 'Function name must be a string',
            'invalid_value_for_type': 'Argument ${index} passed to ${func}() must be ${expectedType}, ${actualType} given, called in ${callerFile} on line ${callerLine} and defined in ${definitionFile}:${definitionLine}',
            'method_called_on_non_object': '${method} method called on non-object',
            'no_parent_class': 'Cannot access parent:: when current class scope has no parent',
            'non_object_method_call': 'Call to a member function ${name}() on ${type}',
            'object_from_get_iterator_must_be_traversable': 'Objects returned by ${className}::getIterator() must be traversable or implement interface Iterator',
            'only_variables_by_reference': 'Only variables can be passed by reference',
            'too_few_args_for_exact_count': 'Too few arguments to function ${func}(), ${actualCount} passed in ${callerFile} on line ${callerLine} and exactly ${expectedCount} expected',
            'uncaught_throwable': 'Uncaught ${name}: ${message}',
            'uncaught_empty_throwable': 'Uncaught ${name}',
            'undeclared_static_property': 'Access to undeclared static property: ${className}::$${propertyName}',
            'undefined_class_constant': 'Undefined class constant \'${name}\'',
            'undefined_constant': 'Undefined constant \'${name}\'',
            'undefined_method': 'Call to undefined method ${className}::${methodName}()',
            'undefined_property': 'Undefined property: ${className}::$${propertyName}',
            'unsupported_operand_types': 'Unsupported operand types',
            'used_this_outside_object_context': 'Using $this when not in object context'
        }
    }
};
