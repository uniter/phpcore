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
    sinon = require('sinon'),
    ArrayValue = require('../../../src/Value/Array').sync(),
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    DebugFactory = require('../../../src/Debug/DebugFactory'),
    ElementReference = require('../../../src/Reference/Element'),
    FloatValue = require('../../../src/Value/Float').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFormatter = require('../../../src/Debug/ValueFormatter');

describe('ValueFormatter', function () {
    beforeEach(function () {
        this.debugFactory = sinon.createStubInstance(DebugFactory);

        this.formatter = new ValueFormatter(this.debugFactory);
    });

    describe('format()', function () {
        it('should display an empty ArrayValue correctly', function () {
            var value = sinon.createStubInstance(ArrayValue);
            value.getKeys.returns([]);
            value.getLength.returns(0);
            value.getNative.returns([]);
            value.getType.returns('array');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [
                    {
                        name: 'length',
                        value: 0,
                        style: 'color: blue;'
                    },
                    {
                        name: 'elements',
                        value: [
                            'table',
                            {}
                        ]
                    }
                ],
                headingStyle: '',
                headingValue: 'Array[0]'
            });
        });

        it('should display an ArrayValue with 3 elements including one reference correctly', function () {
            var element1 = sinon.createStubInstance(ElementReference),
                element1Value = sinon.createStubInstance(Value),
                element2 = sinon.createStubInstance(ElementReference),
                element2Value = sinon.createStubInstance(Value),
                element3 = sinon.createStubInstance(ElementReference),
                element3Value = sinon.createStubInstance(Value),
                key1 = sinon.createStubInstance(StringValue),
                key2 = sinon.createStubInstance(IntegerValue),
                key3 = sinon.createStubInstance(StringValue),
                value = sinon.createStubInstance(ArrayValue);
            value.getKeys.returns([key1, key2, key3]);
            value.getLength.returns(3);
            value.getNative.returns([]);
            value.getType.returns('array');
            value.getElementByKey.withArgs(sinon.match.same(key1)).returns(element1);
            value.getElementByKey.withArgs(sinon.match.same(key2)).returns(element2);
            value.getElementByKey.withArgs(sinon.match.same(key3)).returns(element3);
            element1.getKey.returns(key1);
            element1.getValue.returns(element1Value);
            element1.isReference.returns(false);
            element2.getKey.returns(key2);
            element2.getValue.returns(element2Value);
            element2.isReference.returns(false);
            element3.getKey.returns(key3);
            element3.getValue.returns(element3Value);
            element3.isReference.returns(true);
            key1.getNative.returns('byValElementKey');
            key1.getType.returns('string');
            key2.getNative.returns(21);
            key2.getType.returns('int');
            key3.getNative.returns('byRefElementKey');
            key3.getType.returns('string');
            this.debugFactory.createValue
                .withArgs(sinon.match.same(element1Value))
                .returns({element1: 'first debug val'});
            this.debugFactory.createValue
                .withArgs(sinon.match.same(element2Value))
                .returns({element2: 'second debug val'});
            this.debugFactory.createValue
                .withArgs(sinon.match.same(element3Value))
                .returns({element3: 'third debug val'});

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [
                    {
                        name: 'length',
                        value: 3,
                        style: 'color: blue;'
                    },
                    {
                        name: 'elements',
                        value: [
                            'table',
                            {},
                            [
                                'tr',
                                {},
                                [
                                    'td',
                                    {
                                        'style': 'font-weight: bold;'
                                    },
                                    '"byValElementKey":'
                                ],
                                [
                                    'td',
                                    {},
                                    ['object', {object: {element1: 'first debug val'}}]
                                ]
                            ],
                            [
                                'tr',
                                {},
                                [
                                    'td',
                                    {
                                        'style': 'font-weight: bold;'
                                    },
                                    '21:'
                                ],
                                [
                                    'td',
                                    {},
                                    ['object', {object: {element2: 'second debug val'}}]
                                ]
                            ],
                            [
                                'tr',
                                {},
                                [
                                    'td',
                                    {
                                        'style': 'font-weight: bold;'
                                    },
                                    '&"byRefElementKey":'
                                ],
                                [
                                    'td',
                                    {},
                                    ['object', {object: {element3: 'third debug val'}}]
                                ]
                            ]
                        ]
                    }
                ],
                headingStyle: '',
                headingValue: 'Array[3]'
            });
        });

        it('should display a BooleanValue correctly', function () {
            var value = sinon.createStubInstance(BooleanValue);
            value.getNative.returns(false);
            value.getType.returns('boolean');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [],
                headingStyle: 'color: blue;',
                headingValue: false
            });
        });

        it('should display a FloatValue correctly', function () {
            var value = sinon.createStubInstance(FloatValue);
            value.getNative.returns(27.412);
            value.getType.returns('float');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [],
                headingStyle: 'color: blue;',
                headingValue: 27.412
            });
        });

        it('should display an IntegerValue correctly', function () {
            var value = sinon.createStubInstance(IntegerValue);
            value.getNative.returns(21);
            value.getType.returns('int');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [],
                headingStyle: 'color: blue;',
                headingValue: 21
            });
        });

        it('should display a NullValue correctly', function () {
            var value = sinon.createStubInstance(NullValue);
            value.getNative.returns(null);
            value.getType.returns('null');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [],
                headingStyle: 'font-weight: bold;',
                headingValue: '<null>'
            });
        });

        it('should display a non-function JSObject with constructor ObjectValue correctly', function () {
            var MyClass = function MyClass() {},
                myObject = new MyClass(),
                value = sinon.createStubInstance(ObjectValue);
            value.getClassName.returns('JSObject');
            value.getNative.returns(myObject);
            value.getType.returns('object');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [
                    {
                        name: 'PHP class',
                        value: 'JSObject'
                    },
                    {
                        name: 'JS class',
                        value: 'MyClass'
                    }
                ],
                headingStyle: '',
                headingValue: '<JS:MyClass>'
            });
        });

        it('should display a non-function JSObject without constructor ObjectValue correctly', function () {
            var MyClass = function MyClass() {},
                myObject = new MyClass(),
                value = sinon.createStubInstance(ObjectValue);
            MyClass.prototype.constructor = undefined;
            value.getClassName.returns('JSObject');
            value.getNative.returns(myObject);
            value.getType.returns('object');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [
                    {
                        name: 'PHP class',
                        value: 'JSObject'
                    },
                    {
                        name: 'JS class',
                        value: '(anonymous)'
                    }
                ],
                headingStyle: '',
                headingValue: '<JS:Object>'
            });
        });

        it('should display a function JSObject ObjectValue correctly', function () {
            var value = sinon.createStubInstance(ObjectValue);
            value.getClassName.returns('JSObject');
            value.getNative.returns(function myFunc() {});
            value.getType.returns('object');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [
                    {
                        name: 'PHP class',
                        value: 'JSObject'
                    },
                    {
                        name: 'JS class',
                        value: '(Function)'
                    }
                ],
                headingStyle: '',
                headingValue: '<JS:function myFunc()>'
            });
        });

        it('should display a non-JSObject ObjectValue correctly', function () {
            var value = sinon.createStubInstance(ObjectValue);
            value.getClassName.returns('My\\Space\\ThisIsMyClass');
            value.getNative.returns({});
            value.getType.returns('object');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [
                    {
                        name: 'class',
                        value: 'My\\Space\\ThisIsMyClass'
                    }
                ],
                headingStyle: '',
                headingValue: '<My\\Space\\ThisIsMyClass>'
            });
        });

        it('should display a StringValue correctly', function () {
            var value = sinon.createStubInstance(StringValue);
            value.getNative.returns('this is my string');
            value.getType.returns('string');

            expect(this.formatter.format(value)).to.deep.equal({
                attributes: [],
                headingStyle: 'color: red;',
                headingValue: '"this is my string"'
            });
        });
    });
});
