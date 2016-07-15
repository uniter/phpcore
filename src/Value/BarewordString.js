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
    require('microdash'),
    require('util'),
    require('./String')
], function (
    _,
    util,
    StringValue
) {
    function BarewordStringValue(factory, callStack, value) {
        StringValue.call(this, factory, callStack, value);
    }

    util.inherits(BarewordStringValue, StringValue);

    _.extend(BarewordStringValue.prototype, {
        call: function (args, namespaceOrNamespaceScope) {
            return namespaceOrNamespaceScope.getFunction(this.value).apply(null, args);
        },

        getCallableName: function (namespaceOrNamespaceScope) {
            var rightValue = this,
                resolvedClass = namespaceOrNamespaceScope.resolveClass(rightValue.value);

            return resolvedClass.namespace.getPrefix() + resolvedClass.name;
        },

        isTheClassOfObject: function (objectValue, namespaceOrNamespaceScope) {
            var rightValue = this,
                fqcn = rightValue.getCallableName(namespaceOrNamespaceScope);

            return rightValue.factory.createBoolean(
                objectValue.classIs(fqcn)
            );
        }
    });

    return BarewordStringValue;
}, {strict: true});
