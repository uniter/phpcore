/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

function NamespaceFactory(Namespace, callStack, functionFactory, valueFactory, classAutoloader) {
    this.callStack = callStack;
    this.classAutoloader = classAutoloader;
    this.functionFactory = functionFactory;
    this.Namespace = Namespace;
    this.valueFactory = valueFactory;
}

_.extend(NamespaceFactory.prototype, {
    create: function (parentNamespace, name) {
        var factory = this;

        return new factory.Namespace(
            factory.callStack,
            factory.valueFactory,
            factory,
            factory.functionFactory,
            factory.classAutoloader,
            parentNamespace || null,
            name || ''
        );
    }
});

module.exports = NamespaceFactory;
