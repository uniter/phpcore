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
* Translations for deprecation-level error messages.
*/
module.exports = {
   'en_GB': {
       'core': {
           'null_passed_to_non_nullable_builtin': '${func}(): Passing null to parameter #${index}${context} ${expectedType} is deprecated',
       }
   }
};
