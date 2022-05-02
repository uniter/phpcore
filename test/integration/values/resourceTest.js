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

describe('PHP resource value integration', function () {
    it('should correctly coerce resources to their globally unique ID', async function () {
        var php = nowdoc(function () {/*<<<EOS
<?php

$result = [];

$firstResource = create_my_resource(1234);
$secondResource = create_my_resource(9876);

$result['first resource casted to id int'] = (int)$firstResource;
$result['first resource data fetched via function'] = get_my_resource($firstResource);
$result['second resource casted to id int'] = (int)$secondResource;
$result['second resource data fetched via function'] = get_my_resource($secondResource);

return $result;
EOS
*/;}), //jshint ignore:line
            module = tools.asyncTranspile('/path/to/my_module.php', php),
            engine = module();
        engine.defineNonCoercingFunction('create_my_resource', function (myNumberReference) {
            var resource = {
                myNumber: myNumberReference.getNative()
            };

            return this.valueFactory.createResource('my_resource', resource);
        }, 'int $myNumber');
        engine.defineNonCoercingFunction('get_my_resource', function (myResourceReference) {
            return myResourceReference.getValue().next(function (resourceValue) {
                // Extract the original number given from the inner resource data object.
                return resourceValue.getResource().myNumber;
            });
        });

        expect((await engine.execute()).getNative()).to.deep.equal({
            'first resource casted to id int': 1,
            'first resource data fetched via function': 1234,
            'second resource casted to id int': 2,
            'second resource data fetched via function': 9876
        });
    });
});
