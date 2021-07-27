/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var expect = require('chai').expect,
    nowdoc = require('nowdoc'),
    tools = require('../tools');

describe('PHP null coalescing (??) operator integration', function () {
    it('should support coalescing values correctly in sync mode', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['with a set value'] = 'my set value' ?? 'No, I should not be used';

// Falsy values should be used
$result['with a false value'] = false ?? 'No, I should not be used';
$result['with a zero int value'] = 0 ?? 'No, I should not be used';

// Explicit null should result in the alternate being used
$result['with a direct null value'] = null ?? 'Yes, I should be used';

// Indirect explicit null should result in the alternate being used
$myNullVar = null;
$result['with an indirect null value'] = $myNullVar ?? 'Yes, I should be used';

// Undefined references should result in the alternate being used
$result['with an undefined variable'] = $myUndefinedVar ?? 'Yes, I should be used';
$myObject = new stdClass;
$result['with an undefined object property lookup'] = $myObject->myUndefinedProp ?? 'Yes, I should be used';
$myObject = new stdClass;
$result['with an undefined static property lookup'] = stdClass::$myUndefinedProp ?? 'Yes, I should be used';
$myArray = ['my' => 'element value'];
$result['with an undefined array element lookup'] = $myArray['my undefined element'] ?? 'Yes, I should be used';

// Chained operations should be right-associative
$setVar = 123;
$result['chained operations where first is set'] = $setVar ?? $undefinedVar ?? 'No, I should not be used';
$result['chained operations where second is set'] = $undefinedVar ?? $setVar ?? 'No, I should not be used';

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.syncTranspile('/my/script_path.php', php),
            engine = module();

        expect(engine.execute().getNative()).to.deep.equal({
            'with a set value': 'my set value',
            'with a false value': false,
            'with a zero int value': 0,
            'with a direct null value': 'Yes, I should be used',
            'with an indirect null value': 'Yes, I should be used',
            'with an undefined variable': 'Yes, I should be used',
            'with an undefined object property lookup': 'Yes, I should be used',
            'with an undefined static property lookup': 'Yes, I should be used',
            'with an undefined array element lookup': 'Yes, I should be used',
            'chained operations where first is set': 123,
            'chained operations where second is set': 123
        });
    });

    it('should support coalescing values correctly in async mode with pauses', function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$result['with a set value'] = get_async('my set value') ?? get_async('No, I should not be used');

// Falsy values should be used
$result['with a false value'] = get_async(false) ?? get_async('No, I should not be used');
$result['with a zero int value'] = get_async(0) ?? get_async('No, I should not be used');

// Explicit null should result in the alternate being used
$result['with a direct null value'] = get_async(null) ?? get_async('Yes, I should be used');

// Indirect explicit null should result in the alternate being used
$myNullVar = null;
$result['with an indirect null value'] = get_async($myNullVar) ?? get_async('Yes, I should be used');

// Undefined references should result in the alternate being used
$result['with an undefined variable'] = $myUndefinedVar ?? get_async('Yes, I should be used');
$myObject = new stdClass;
$result['with an undefined object property lookup'] = $myObject->myUndefinedProp ?? get_async('Yes, I should be used');
$myObject = new stdClass;
$result['with an undefined static property lookup'] = stdClass::$myUndefinedProp ?? get_async('Yes, I should be used');
$myArray = ['my' => 'element value'];
$result['with an undefined array element lookup'] = $myArray['my undefined element'] ?? get_async('Yes, I should be used');

// Chained operations should be right-associative
$setVar = 123;
$result['chained operations where first is set'] = get_async($setVar) ?? $undefinedVar ?? get_async('No, I should not be used');
$result['chained operations where second is set'] = $undefinedVar ?? get_async($setVar) ?? get_async('No, I should not be used');

return get_async($result);
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/my/script_path.php', php),
            engine = module();
        engine.defineFunction('get_async', function (internals) {
            return function (value) {
                return internals.createFutureValue(function (resolve) {
                    setImmediate(function () {
                        resolve(value);
                    });
                });
            };
        });

        return engine.execute().then(function (resultValue) {
            expect(resultValue.getNative()).to.deep.equal({
                'with a set value': 'my set value',
                'with a false value': false,
                'with a zero int value': 0,
                'with a direct null value': 'Yes, I should be used',
                'with an indirect null value': 'Yes, I should be used',
                'with an undefined variable': 'Yes, I should be used',
                'with an undefined object property lookup': 'Yes, I should be used',
                'with an undefined static property lookup': 'Yes, I should be used',
                'with an undefined array element lookup': 'Yes, I should be used',
                'chained operations where first is set': 123,
                'chained operations where second is set': 123
            });
        });
    });
});
