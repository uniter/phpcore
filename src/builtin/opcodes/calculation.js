/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception,
    PHPError = phpCommon.PHPError,
    KeyReferencePair = require('../../KeyReferencePair'),
    KeyValuePair = require('../../KeyValuePair'),
    List = require('../../List'),
    ReferenceElement = require('../../Element/ReferenceElement'),

    NO_PARENT_CLASS = 'core.no_parent_class',
    TICK_OPTION = 'tick';

/**
 * Provides the calculation opcodes for the runtime API that the JS output by the transpiler calls into.
 *
 * All opcodes that do not affect control flow or instrument the code are handled here.
 *
 * @param {OpcodeInternals} internals
 * @constructor
 */
module.exports = function (internals) {
    var callStack = internals.callStack,
        evaluator = internals.evaluator,
        flow = internals.flow,
        includer = internals.includer,
        onceIncluder = internals.onceIncluder,
        opcodeHandlerFactory = internals.opcodeHandlerFactory,
        optionSet = internals.optionSet,
        output = internals.output,
        referenceFactory = internals.referenceFactory,
        valueFactory = internals.valueFactory,
        valueProvider = internals.valueProvider;

    internals.setOpcodeFetcher('calculation');

    return {
        /**
         * Adds two Values together, returning the result wrapped as a Value
         *
         * Used by the `+` operator
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        add: function (leftReference, rightReference) {
            // Note that either operand could evaluate to a FutureValue, for handling async operation
            return leftReference.getValue().add(rightReference.getValue());
        },

        /**
         * Moves the iterator to the next position
         *
         * @param {ArrayIterator|ObjectValue} iterator
         * @returns {FutureValue|undefined}
         */
        advance: function (iterator) {
            return iterator.advance();
        },

        /**
         * Bitwise-ANDs two Values together, returning the result wrapped as a Value
         *
         * Used by the `&` operator
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        bitwiseAnd: function (leftReference, rightReference) {
            // Note that either operand could evaluate to a FutureValue, for handling async operation
            return leftReference.getValue().bitwiseAnd(rightReference.getValue());
        },

        /**
         * Bitwise-ANDs two Values together, writing the result back to the source operand
         *
         * Used by the `&=` operator
         *
         * @param {Reference|Value|Variable} targetReference
         * @param {Reference|Value|Variable} sourceReference
         * @returns {Value}
         */
        bitwiseAndWith: function (targetReference, sourceReference) {
            // The result of an assignment is the value assigned. Also note that either operand
            // could evaluate to a FutureValue, for handling async operation
            return targetReference.setValue(targetReference.getValue().bitwiseAnd(sourceReference.getValue()));
        },

        /**
         * Bitwise-ORs two Values together, returning the result wrapped as a Value
         *
         * Used by the `|` operator
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        bitwiseOr: function (leftReference, rightReference) {
            // Note that either operand could evaluate to a FutureValue, for handling async operation
            return leftReference.getValue().bitwiseOr(rightReference.getValue());
        },

        /**
         * Bitwise-ORs two Values together, writing the result back to the target operand
         *
         * Used by the `|=` operator
         *
         * @param {Reference|Value|Variable} targetReference
         * @param {Reference|Value|Variable} sourceReference
         * @returns {Value}
         */
        bitwiseOrWith: function (targetReference, sourceReference) {
            // The result of an assignment is the value assigned. Also note that either operand
            // could evaluate to a FutureValue, for handling async operation
            return targetReference.setValue(targetReference.getValue().bitwiseOr(sourceReference.getValue()));
        },

        /**
         * Bitwise-XORs two Values together, returning the result wrapped as a Value
         *
         * Used by the `^` operator
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        bitwiseXor: function (leftReference, rightReference) {
            // Note that either operand could evaluate to a FutureValue, for handling async operation
            return leftReference.getValue().bitwiseXor(rightReference.getValue());
        },

        /**
         * Bitwise-XORs two Values together, writing the result back to the target operand
         *
         * Used by the `^=` operator
         *
         * @param {Reference|Value|Variable} targetReference
         * @param {Reference|Value|Variable} sourceReference
         * @returns {Value}
         */
        bitwiseXorWith: function (targetReference, sourceReference) {
            // The result of an assignment is the value assigned. Also note that either operand
            // could evaluate to a FutureValue, for handling async operation
            return targetReference.setValue(targetReference.getValue().bitwiseXor(sourceReference.getValue()));
        },

        /**
         * Calls a PHP function where the name is known statically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * @param {string} name
         * @param {Reference[]|Value[]|Variable[]} argReferences
         * @returns {Reference|Value}
         */
        callFunction: function (name, argReferences) {
            var namespaceScope = callStack.getCurrentNamespaceScope(),
                barewordString = valueFactory.createBarewordString(name, namespaceScope);

            return barewordString.call(argReferences);
        },

        /**
         * Calls a PHP instance method where the name is known statically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * @param {Reference|Value|Variable} objectReference
         * @param {string} methodName
         * @param {Reference[]|Value[]|Variable[]} argReferences
         * @returns {Reference|Value}
         */
        callInstanceMethod: function (objectReference, methodName, argReferences) {
            var objectValue = objectReference.getValue();

            return objectValue.callMethod(methodName, argReferences);
        },

        /**
         * Calls a static method of a class
         *
         * @param {Reference|Value|Variable} classReference
         * @param {string} methodName
         * @param {Reference[]|Value[]|Variable[]} argReferences
         * @param {bool=} isForwarding eg. self::f() is forwarding, MyParentClass::f() is non-forwarding
         * @returns {Value}
         */
        callStaticMethod: function (classReference, methodName, argReferences, isForwarding) {
            var classValue = classReference.getValue(),
                // TODO: Remove need for wrapping this as a *Value
                methodValue = valueFactory.createString(methodName);

            return classValue.callStaticMethod(methodValue, argReferences, isForwarding);
        },

        /**
         * Calls a PHP function where the name is fetched dynamically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * @param {Reference|Value|Variable} nameReference
         * @param {Reference[]|Value[]|Variable[]} argReferences
         * @returns {Reference|Value}
         */
        callVariableFunction: function (nameReference, argReferences) {
            // NB: Make sure we do not coerce argument references to their values,
            //     in case any of the parameters are passed by reference
            return nameReference.getValue().call(argReferences);
        },

        /**
         * Calls a method of an object where the name is fetched dynamically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * @param {Reference|Value|Variable} objectReference
         * @param {Reference|Value|Variable} methodNameReference
         * @param {Reference[]|Value[]|Variable[]} argReferences
         * @returns {Reference|Value}
         */
        callVariableInstanceMethod: function (objectReference, methodNameReference, argReferences) {
            var objectValue = objectReference.getValue();

            return methodNameReference.getValue()
                .asFuture() // Do not wrap result as a value, may be return-by-reference.
                .next(function (methodNameValue) {
                    var methodName = methodNameValue.getNative(); // Now guaranteed to be present.

                    return objectValue.callMethod(methodName, argReferences);
                });
        },

        /**
         * Calls a static method of a class where the name is fetched dynamically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * @param {Reference|Value|Variable} classNameReference
         * @param {Reference|Value|Variable} methodNameReference
         * @param {Reference[]|Value[]|Variable[]} argReferences
         * @returns {Reference|Value}
         */
        callVariableStaticMethod: function (classNameReference, methodNameReference, argReferences) {
            var classNameValue = classNameReference.getValue(),
                methodNameValue = methodNameReference.getValue();

            return classNameValue.callStaticMethod(methodNameValue, argReferences);
        },

        /**
         * Clones the given ObjectValue
         *
         * @param {Reference|Value|Variable} objectReference
         * @returns {FutureValue<ObjectValue>|ObjectValue}
         */
        clone: function (objectReference) {
            return objectReference.getValue().clone();
        },

        coerceToArray: function (reference) {
            return reference.getValue().coerceToArray();
        },

        coerceToBoolean: function (reference) {
            return reference.getValue().coerceToBoolean();
        },

        coerceToFloat: function (reference) {
            return reference.getValue().coerceToFloat();
        },

        coerceToInteger: function (reference) {
            return reference.getValue().coerceToInteger();
        },

        coerceToObject: function (reference) {
            return reference.getValue().coerceToObject();
        },

        coerceToString: function (reference) {
            return reference.getValue().coerceToString();
        },

        /**
         * Concatenates two Values together, returning the result wrapped as a Value
         *
         * Used by the `.` operator
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        concat: function (leftReference, rightReference) {
            return leftReference.getValue().concat(rightReference.getValue());
        },

        /**
         * Coerces the value from this reference and the specified one to strings,
         * concatenates them together and then assigns the result back to the target operand.
         *
         * Used by the `.=` operator
         *
         * @param {Reference|Value|Variable} targetReference
         * @param {Reference|Value|Variable} sourceReference
         * @returns {Value}
         */
        concatWith: function (targetReference, sourceReference) {
            // The result of an assignment is the value assigned. Also note that either operand
            // could evaluate to a FutureValue, for handling async operation
            return targetReference.setValue(targetReference.getValue().concat(sourceReference.getValue()));
        },

        /**
         * Creates an ArrayValue with the given elements.
         *
         * @param {KeyReferencePair[]|KeyValuePair[]|Reference[]|Value[]|Variable[]} elements
         * @returns {FutureValue<ArrayValue>}
         */
        createArray: function (elements) {
            return valueProvider.createFutureArray(elements);
        },

        createBareword: function (nativeValue) {
            var namespaceScope = callStack.getCurrentNamespaceScope();

            return valueFactory.createBarewordString(nativeValue, namespaceScope);
        },

        createBoolean: function (nativeValue) {
            return valueFactory.createBoolean(nativeValue);
        },

        /**
         * Creates an ObjectValue that wraps an instance of the builtin PHP Closure class
         * whose behaviour is defined by the provided function
         *
         * @param {Function} func
         * @param {Array=} parametersSpecData
         * @param {Array=} bindingsSpecData
         * @param {boolean=} isStatic
         * @param {number=} lineNumber
         * @returns {ObjectValue}
         */
        createClosure: function (func, parametersSpecData, bindingsSpecData, isStatic, lineNumber) {
            var namespaceScope = callStack.getCurrentNamespaceScope(),
                referenceBindings = {},
                scope = callStack.getCurrentScope(),
                valueBindings = {};

            return flow.eachAsync(bindingsSpecData || [], function (bindingSpecData) {
                var variable = scope.getVariable(bindingSpecData.name);

                if (!bindingSpecData.ref) {
                    return variable.getValue().next(function (presentValue) {
                        valueBindings[bindingSpecData.name] = presentValue;
                    });
                }

                referenceBindings[bindingSpecData.name] = variable.getReference();
            })
                .next(function () {
                    return valueFactory.createClosureObject(
                        scope.createClosure(
                            namespaceScope,
                            func,
                            parametersSpecData || [],
                            bindingsSpecData || [],
                            referenceBindings,
                            valueBindings,
                            !!isStatic,
                            lineNumber || null
                        )
                    );
                });
        },

        createFloat: function (nativeValue) {
            return valueFactory.createFloat(nativeValue);
        },

        /**
         * Used by transpiled PHP `new MyClass(<args>)` expressions
         *
         * @param {Reference|Value|Variable} classNameReference
         * @param {Value[]} args Arguments to pass to the constructor
         * @returns {FutureValue<ObjectValue>|ObjectValue}
         */
        createInstance: function (classNameReference, args) {
            var classNameValue = classNameReference.getValue();

            return classNameValue.instantiate(args);
        },

        createInteger: function (nativeValue) {
            return valueFactory.createInteger(nativeValue);
        },

        createKeyReferencePair: function (keyReference, reference) {
            return new KeyReferencePair(
                keyReference.getValue(),
                // Reference may not be a ReferenceSlot (if applicable), so we must ensure it like this
                reference.getReference()
            );
        },

        createKeyValuePair: function (keyReference, valueReference) {
            return new KeyValuePair(keyReference.getValue(), valueReference.getValue());
        },

        /**
         * Creates a new List, which is a list of references that may be assigned to
         * by assigning them an array, where each list element gets the corresponding array element
         *
         * @param {Reference[]} elements
         * @returns {List}
         */
        createList: function (elements) {
            return new List(valueFactory, flow, elements);
        },

        /**
         * Fetches a ReferenceElement for the given reference. Note that if a value is given
         * instead, an error will be thrown.
         *
         * Also note that an internal ReferenceSlot will be created if applicable.
         *
         * @param {Reference|Value|Variable} valueOrReference
         * @returns {ReferenceElement}
         * @throws {Error} Throws when a value is given instead of a reference
         */
        createReferenceElement: function (valueOrReference) {
            return new ReferenceElement(valueOrReference.getReference());
        },

        createString: function (nativeValue) {
            return valueFactory.createString(nativeValue);
        },

        /**
         * Creates a NullReference, which discards any value written to it.
         * Used for list(...) elements that indicate skipping of an element of the assigned array.
         *
         * @returns {NullReference}
         */
        createVoid: function () {
            return referenceFactory.createNull();
        },

        /**
         * Subtracts the value of the source reference from the target reference's value,
         * then writes the result back to the target reference
         *
         * Used by the `-=` operator
         *
         * @param {Reference|Value|Variable} targetReference
         * @param {Reference|Value|Variable} sourceReference
         * @returns {Value}
         */
        decrementBy: function (targetReference, sourceReference) {
            // The result of an assignment is the value assigned. Also note that either operand
            // could evaluate to a FutureValue, for handling async operation
            return targetReference.setValue(targetReference.getValue().subtract(sourceReference.getValue()));
        },

        /**
         * Divides a Value by another, returning the result wrapped as a Value
         *
         * Used by the `/` operator
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        divide: function (leftReference, rightReference) {
            // Note that either operand could evaluate to a FutureValue, for handling async operation
            return leftReference.getValue().divideBy(rightReference.getValue());
        },

        /**
         * Divides the value of the target reference by the source reference's value,
         * then writes the result back to the target reference
         *
         * Used by the `/=` operator
         *
         * @param {Reference|Value|Variable} targetReference
         * @param {Reference|Value|Variable} sourceReference
         * @returns {Value}
         */
        divideBy: function (targetReference, sourceReference) {
            // The result of an assignment is the value assigned. Also note that either operand
            // could evaluate to a FutureValue, for handling async operation
            return targetReference.setValue(targetReference.getValue().divideBy(sourceReference.getValue()));
        },

        /**
         * Writes the given value to output. Note that unlike print() there is no return value.
         *
         * @param {Reference|Value|Variable} textReference
         * @returns {FutureValue}
         */
        echo: function (textReference) {
            return textReference.getValue().coerceToString().next(function (textValue) {
                var text = textValue.getNative(); // Guaranteed to be present by this point.

                output.write(text);
            });
        },

        /**
         * Evaluates the given PHP code using the configured `eval` option
         *
         * @param {Reference|Value|Variable} codeReference
         * @returns {Value}
         */
        eval: function (codeReference) {
            return codeReference.getValue().next(function (codeValue) {
                var code = codeValue.getNative(); // Guaranteed to be present by this point.

                return evaluator.eval(code, callStack.getCurrentModuleScope().getEnvironment());
            });
        },

        /**
         * Fetches a constant of the given class
         *
         * Used by "::CLASS_NAME"
         *
         * @param {Reference|Value|Variable} classNameReference
         * @param {string} constantName
         * @returns {Value}
         */
        getClassConstant: function (classNameReference, constantName) {
            return classNameReference.getValue().getConstantByName(constantName);
        },

        /**
         * Fetches the name of the current class, or an empty string if there is none
         *
         * Used by "self::" inside property or constant definitions and by "__CLASS__"
         *
         * @returns {StringValue}
         */
        getClassName: function () {
            return callStack.getCurrentScope().getClassName();
        },

        /**
         * Fetches the name of the class in which the current scope's function is defined
         *
         * Used by "self::" inside methods
         *
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no current class scope
         */
        getClassNameOrThrow: function () {
            return callStack.getCurrentScope().getClassNameOrThrow();
        },

        /**
         * Fetches the value of a constant in the current NamespaceScope
         *
         * @param {string} name
         * @returns {Value}
         */
        getConstant: function (name) {
            var namespaceScope = callStack.getCurrentNamespaceScope();

            return namespaceScope.getConstant(name);
        },

        /**
         * Fetches a constant of the current class
         *
         * Used by static property initialisers and class constants
         *
         * @param {Class} currentClass
         * @param {string} constantName
         * @returns {Value}
         */
        getCurrentClassConstant: function (currentClass, constantName) {
            return currentClass.getConstantByName(constantName);
        },

        /**
         * Fetches the reference of the element this iterator is currently pointing at.
         *
         * @param {ArrayIterator|ObjectValue} iterator
         * @returns {Reference}
         */
        getCurrentElementReference: function (iterator) {
            return iterator.getCurrentElementReference();
        },

        /**
         * Fetches the value of the element this iterator is currently pointing at
         *
         * @param {ArrayIterator|ObjectValue} iterator
         * @returns {Value}
         */
        getCurrentElementValue: function (iterator) {
            return iterator.getCurrentElementValue();
        },

        /**
         * Fetches the key of the element this iterator is currently pointing at.
         * If the array is empty or the pointer is past the end of the array,
         * null will be returned.
         *
         * @param {ArrayIterator|ObjectValue} iterator
         * @returns {Value}
         */
        getCurrentKey: function (iterator) {
            return iterator.getCurrentKey();
        },

        /**
         * Fetches an array element where the key is known statically.
         * See .getVariableElement(...) for where the key is dynamic.
         * This version exists to optimise bundle size by eliminating the need
         * to wrap the key in a Value object in the transpiled JS.
         *
         * @param {Reference|Value|Variable} arrayReference
         * @param {number|string} nativeKey
         * @returns {Future<ElementReference>}
         */
        getElement: function (arrayReference, nativeKey) {
            // TODO: Remove need for this to be wrapped as a Value
            var keyValue = valueFactory.coerce(nativeKey);

            return internals.implyArray(arrayReference)
                .asFuture() // Do not wrap result as a value, we expect to resolve with an (object)element reference.
                .next(function (arrayValue) {
                    return arrayValue.getElementByKey(keyValue);
                });
        },

        /**
         * Fetches the name of the current function, or an empty string if there is none
         *
         * @returns {StringValue}
         */
        getFunctionName: function () {
            return callStack.getCurrentScope().getFunctionName();
        },

        getInstanceProperty: function (objectReference, propertyName) {
            // TODO: Remove need for this to be wrapped as a StringValue
            var propertyNameValue = valueFactory.createString(propertyName);

            return objectReference.getValue()
                .asFuture() // Do not wrap result as a value, we expect to resolve with a property reference.
                .next(function (presentValue) {
                    return presentValue.getInstancePropertyByName(propertyNameValue);
                });
        },

        /**
         * Fetches the name of the current method, or an empty string if there is none
         *
         * @returns {StringValue}
         */
        getMethodName: function () {
            return callStack.getCurrentScope().getMethodName();
        },

        /**
         * Fetches the name of the current namespace
         *
         * @param {NamespaceScope} namespaceScope
         * @returns {StringValue}
         */
        getNamespaceName: function () {
            return callStack.getCurrentNamespaceScope().getNamespaceName();
        },

        getNative: function (valueReference) {
            return valueReference.getValue().getNative();
        },

        /**
         * Fetches the path to the current script, wrapped as a StringValue
         *
         * @returns {StringValue}
         */
        getPath: function () {
            return valueFactory.createString(callStack.getCurrentModuleScope().getNormalisedPath());
        },

        /**
         * Fetches the path to the directory containing the current script, wrapped as a StringValue
         *
         * @returns {StringValue}
         */
        getPathDirectory: function () {
            var path = callStack.getCurrentNamespaceScope().getFilePath(),
                directory = (path || '').replace(/(^|\/)[^\/]+$/, '');

            return valueFactory.createString(directory || '');
        },

        /**
         * Fetches a ReferenceSlot (if applicable) for the given reference. Note that if a value is given
         * instead, an error will be thrown.
         *
         * @param {Reference|Value|Variable} valueOrReference
         * @returns {Reference|ReferenceSlot}
         * @throws {Error} Throws when a value is given instead of a reference
         */
        getReference: function (valueOrReference) {
            return valueOrReference.getReference();
        },

        /**
         * Fetches a bound variable reference for the current Closure.
         *
         * Used by transpiled Closure functions with reference bindings,
         *     eg. "function (...) use (&$myVar) {...}".
         *
         * @param {string} name
         * @returns {ReferenceSlot}
         */
        getReferenceBinding: function (name) {
            var scope = callStack.getCurrentScope();

            return scope.getReferenceBinding(name);
        },

        /**
         * Fetches the name of the current static class scope, which may be different
         * from the class in which its function is defined (eg. after a forward_static_call(...))
         *
         * Used by "static::"
         *
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no static class scope
         */
        getStaticClassName: function () {
            var scope = callStack.getCurrentScope();

            return scope.getStaticClassNameOrThrow();
        },

        getStaticProperty: function (classReference, propertyName) {
            var classValue = classReference.getValue(),
                // TODO: Remove need for this to be wrapped as a StringValue
                propertyNameValue = valueFactory.createString(propertyName);

            return classValue.getStaticPropertyByName(propertyNameValue);
        },

        /**
         * Fetches the name of the parent class
         *
         * Used by "parent::" inside property or constant definitions
         *
         * @param {Class} classObject
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no parent class
         */
        getSuperClassName: function (classObject) {
            var superClass = classObject.getSuperClass();

            if (!superClass) {
                // Fatal error: Uncaught Error: Cannot access parent:: when current class scope has no parent
                callStack.raiseTranslatedError(PHPError.E_ERROR, NO_PARENT_CLASS);
            }

            return valueFactory.createString(superClass.getName());
        },

        /**
         * Fetches the name of the parent of the class in which the current scope's function is defined
         *
         * Used by "parent::" inside methods
         *
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no current class scope or current class has no parent
         */
        getSuperClassNameOrThrow: function () {
            return callStack.getCurrentScope().getParentClassNameOrThrow();
        },

        /**
         * Fetches a bound variable value for the current Closure.
         *
         * Used by transpiled Closure functions with value bindings,
         *     eg. "function (...) use ($myVar) {...}".
         *
         * @param {string} name
         * @returns {Value}
         */
        getValueBinding: function (name) {
            var scope = callStack.getCurrentScope();

            return scope.getValueBinding(name);
        },

        getVariable: function (name) {
            return callStack.getCurrentScope().getVariable(name);
        },

        /**
         * Fetches an array element where the key is fetched dynamically.
         *
         * @param {Reference|Value|Variable} arrayReference
         * @param {Reference|Value|Variable} keyReference
         * @returns {Future<ElementReference>}
         */
        getVariableElement: function (arrayReference, keyReference) {
            return internals.implyArray(arrayReference)
                .asFuture() // Do not wrap result as a value, we expect to resolve with an (object)element reference.
                .next(function (arrayValue) {
                    return keyReference.getValue()
                        .asFuture() // Do not wrap result as a value, we expect to resolve with an (object)element reference.
                        .next(function (keyValue) {
                            return arrayValue.getElementByKey(keyValue);
                        });
                });
        },

        /**
         * Fetches a variable from the enclosing scope. Used by closures when binding variables
         * from the parent scope into the closure with "use (...)".
         *
         * @param {string} name
         * @param {Scope} scope
         * @returns {Variable}
         */
        getVariableForScope: function (name, scope) {
            return scope.getVariable(name);
        },

        /**
         * Fetches an instance property of the given reference's value (assuming it contains an object) by its name
         *
         * @param {Reference|Value|Variable} objectReference
         * @param {Reference|Value|Variable} propertyNameReference
         * @returns {PropertyReference}
         */
        getVariableInstanceProperty: function (objectReference, propertyNameReference) {
            return objectReference.getValue()
                .asFuture() // Do not wrap result as a value, we expect to resolve with a property reference.
                .next(function (presentValue) {
                    return presentValue.getInstancePropertyByName(propertyNameReference.getValue());
                });
        },

        /**
         * Fetches a static property of the given reference's value (assuming it contains an object or FQCN string) by its name
         *
         * @param {Reference|Value|Variable} objectReference
         * @param {Reference|Value|Variable} propertyNameReference
         * @returns {Future<StaticPropertyReference>}
         */
        getVariableStaticProperty: function (objectReference, propertyNameReference) {
            return objectReference.getValue().getStaticPropertyByName(propertyNameReference.getValue());
        },

        /**
         * Fetches a variable from the current scope with the name specified by the given variable
         * (note this is a dynamic lookup)
         *
         * Used by the `$$myVarName` and `${$myVarName}` constructs
         *
         * @param {Reference|Value|Variable} nameReference
         * @returns {Future<Variable>}
         */
        getVariableVariable: function (nameReference) {
            return nameReference.getValue()
                .asFuture() // Avoid auto-boxing the Variable result as an ObjectValue.
                .next(function (nameValue) {
                    return callStack.getCurrentScope().getVariable(nameValue.getNative());
                });
        },

        /**
         * Coerces the value to a float or int as appropriate
         *
         * Used by the `+$val` operator
         *
         * @param {Reference|Value|Variable} reference
         * @returns {FloatValue|IntegerValue}
         */
        identity: function (reference) {
            return reference.getValue().coerceToNumber();
        },

        /**
         * Imports a global variable into the current scope.
         * Used by the "global $myVar;" statement.
         *
         * @param {string} name
         */
        importGlobal: function (name) {
            callStack.getCurrentScope().importGlobal(name);
        },

        /**
         * Imports a static variable into the current scope, so that it will retain its value between calls.
         * Used by the "static $myVar;" statement.
         *
         * @param {string} name
         * @param {Value|null} initialValue
         */
        importStatic: function (name, initialValue) {
            callStack.getCurrentScope().importStatic(name, initialValue);
        },

        /**
         * Includes the specified module, returning its return value.
         * Throws if no include transport has been configured.
         * Raises a warning and returns false if the module cannot be found.
         *
         * @param {Reference|Value|Variable} includedPathReference
         * @returns {Value}
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        include: function (includedPathReference) {
            var enclosingScope = callStack.getCurrentScope(),
                moduleScope = callStack.getCurrentModuleScope();

            return includedPathReference.getValue().next(function (includedPathValue) {
                var includedPath = includedPathValue.getNative(); // Guaranteed to be present by this point.

                return includer.include(
                    'include',
                    PHPError.E_WARNING, // For includes, only a warning is raised on failure
                    moduleScope.getEnvironment(),
                    moduleScope.getModule(),
                    includedPath,
                    enclosingScope,
                    optionSet.getOptions()
                );
            });
        },

        /**
         * Includes the specified module if it has not been included yet.
         * If it has not already been included, the module's return value is returned,
         * otherwise boolean true will be returned.
         * Throws if no include transport has been configured.
         *
         * @param {Reference|Value|Variable} includedPathReference
         * @returns {Value}
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        includeOnce: function (includedPathReference) {
            var enclosingScope = callStack.getCurrentScope(),
                moduleScope = callStack.getCurrentModuleScope();

            return includedPathReference.getValue().next(function (includedPathValue) {
                var includedPath = includedPathValue.getNative(); // Guaranteed to be present by this point.

                return onceIncluder.includeOnce(
                    'include_once',
                    PHPError.E_WARNING, // For includes, only a warning is raised on failure
                    moduleScope.getEnvironment(),
                    moduleScope.getModule(),
                    includedPath,
                    enclosingScope,
                    optionSet.getOptions()
                );
            });
        },

        /**
         * Adds the value of the target reference by the source reference's value,
         * then writes the result back to the target reference
         *
         * @param {Reference|Value|Variable} targetReference
         * @param {Reference|Value|Variable} sourceReference
         * @returns {Value}
         */
        incrementBy: function (targetReference, sourceReference) {
            // The result of an assignment is the value assigned. Also note that either operand
            // could evaluate to a FutureValue, for handling async operation
            return targetReference.setValue(targetReference.getValue().add(sourceReference.getValue()));
        },

        /**
         * Determines whether the object is an instance of the given class
         *
         * @param {Reference|Value|Variable} objectReference
         * @param {Reference|Value|Variable} classNameReference
         * @returns {BooleanValue}
         */
        instanceOf: function (objectReference, classNameReference) {
            return objectReference.getValue().isAnInstanceOf(classNameReference.getValue());
        },

        /**
         * Combines parts of a string containing reference interpolations.
         *
         * Used by both string interpolations ("my string $here") and heredocs.
         *
         * @param {Reference[]|Value[]|Variable[]} references
         * @returns {FutureValue<StringValue>}
         */
        interpolate: function (references) {
            return flow.mapAsync(
                references,
                function (reference) {
                    if (typeof reference === 'string') {
                        return reference;
                    }

                    // Fetch value from reference:
                    return reference
                        // ... allowing for pauses (eg. AccessorReference)
                        .getValue()
                        // ... and coerce to string values, allowing for pauses (eg. __toString() methods that pause)
                        .coerceToString();
                }
            ).next(function (stringParts) {
                // Convert all values to native strings, concatenate everything together
                // and build the final string value
                return valueFactory.createString(
                    _.map(stringParts, function (stringPart) {
                        // We handle the common case of string literal fragments specially,
                        // by embedding the primitive string literal, to save on bundle size
                        return typeof stringPart === 'string' ?
                            stringPart :
                            stringPart.getNative();
                    })
                        .join('')
                );
            }).asValue();
        },

        /**
         * Returns a special opcode handler function that is then passed the reference to test.
         * Errors will be suppressed (as empty(...) may be used to test undefined variables, etc.)
         * and the result will be wrapped as a BooleanValue.
         *
         * Used by the "empty(...)" construct.
         *
         * @returns {Function}
         */
        isEmpty: function () {
            var scope = callStack.getCurrentScope();

            scope.suppressOwnErrors();

            // The returned function must be treated as a separate opcode, as if there is a pause
            // its result must be stored in the trace and not applied to the parent opcode (eg. setValue)
            return opcodeHandlerFactory.createTracedHandler(
                /**
                 * Return a function that accepts the reference while we have errors suppressed (see above)
                 *
                 * @param {Reference|Value|Variable} reference
                 * @returns {FutureValue|Value}
                 */
                function (reference) {
                    var isEmpty = reference.isEmpty();

                    // Note that .isEmpty() could return a Future, in which case
                    // .coerce() will wrap it as a FutureValue
                    return valueFactory.coerce(isEmpty)
                        .next(function (resultValue) {
                            scope.unsuppressOwnErrors();

                            return resultValue;
                        });
                },
                'calculation'
            );
        },

        /**
         * Determines whether two operands are equal.
         * The result will be wrapped as a BooleanValue.
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {BooleanValue|FutureValue<BooleanValue>}
         */
        isEqual: function (leftReference, rightReference) {
            return leftReference.getValue().isEqualTo(rightReference.getValue());
        },

        /**
         * Determines whether the left operand is greater than the right one.
         * The result will be wrapped as a BooleanValue.
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {BooleanValue}
         */
        isGreaterThan: function (leftReference, rightReference) {
            return leftReference.getValue().isGreaterThan(rightReference.getValue());
        },

        /**
         * Determines whether the left operand is greater than or equal to the right one.
         * The result will be wrapped as a BooleanValue.
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {BooleanValue}
         */
        isGreaterThanOrEqual: function (leftReference, rightReference) {
            return leftReference.getValue().isGreaterThanOrEqual(rightReference.getValue());
        },

        /**
         * Determines whether two operands are identical (same type and value).
         * The result will be wrapped as a BooleanValue.
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {BooleanValue}
         */
        isIdentical: function (leftReference, rightReference) {
            return leftReference.getValue().isIdenticalTo(rightReference.getValue());
        },

        /**
         * Determines whether the left operand is less than the right one.
         * The result will be wrapped as a BooleanValue.
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {BooleanValue}
         */
        isLessThan: function (leftReference, rightReference) {
            return leftReference.getValue().isLessThan(rightReference.getValue());
        },

        /**
         * Determines whether the left operand is less than or equal to the right one.
         * The result will be wrapped as a BooleanValue.
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {BooleanValue}
         */
        isLessThanOrEqual: function (leftReference, rightReference) {
            return leftReference.getValue().isLessThanOrEqual(rightReference.getValue());
        },

        /**
         * Determines whether two operands are not equal.
         * The result will be wrapped as a BooleanValue.
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {BooleanValue}
         */
        isNotEqual: function (leftReference, rightReference) {
            return leftReference.getValue().isNotEqualTo(rightReference.getValue());
        },

        /**
         * Determines whether two operands are not identical (differ in type and/or value).
         * The result will be wrapped as a BooleanValue.
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {BooleanValue}
         */
        isNotIdentical: function (leftReference, rightReference) {
            return leftReference.getValue().isNotIdenticalTo(rightReference.getValue());
        },

        /**
         * Returns a special opcode handler function that is then passed the reference(s) to test.
         * Errors will be suppressed (as isset(...) may be used to test undefined variables, etc.)
         * and the result will be wrapped as a BooleanValue.
         *
         * Used by the "isset(...)" construct.
         *
         * @returns {Function}
         */
        isSet: function () {
            var scope = callStack.getCurrentScope();

            scope.suppressOwnErrors();

            // The returned function must be treated as a separate opcode, as if there is a pause
            // its result must be stored in the trace and not applied to the parent opcode (eg. setValue)
            return opcodeHandlerFactory.createTracedHandler(
                /**
                 * Return a function that accepts the references while we have errors suppressed (see above)
                 *
                 * @param {Reference|Value|Variable} references
                 * @returns {Value}
                 */
                function (references) {
                    var allAreSet = true;

                    return flow.eachAsync(references, function (reference) {
                        // This may return a FutureValue if the reference has an accessor that pauses,
                        // eg. an AccessorReference, a reference to an instance property
                        // that is handled by a magic __get() method or an ArrayAccess element
                        return valueFactory.coerce(reference.isSet())
                            .asFuture()
                            .next(function (isSetValue) {
                                var isSet = isSetValue.getNative();

                                if (!isSet) {
                                    allAreSet = false;

                                    return false; // Stop iteration once any unset value is reached
                                }
                            });
                    })
                        .next(function () {
                            scope.unsuppressOwnErrors();

                            return valueFactory.createBoolean(allAreSet);
                        });
                },
                'calculation'
            );
        },

        /**
         * Coerces to boolean and then inverts the given reference's value
         *
         * @param {Reference|Value|Variable} reference
         * @returns {BooleanValue}
         */
        logicalNot: function (reference) {
            // Note that the operand could evaluate to a FutureValue, for handling async operation
            return reference.getValue().logicalNot();
        },

        /**
         * Xor should be true if LHS is not equal to RHS:
         * coerce to booleans then compare for inequality
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {BooleanValue}
         */
        logicalXor: function (leftReference, rightReference) {
            return leftReference.getValue().logicalXor(rightReference.getValue());
        },

        modulo: function (leftReference, rightReference) {
            // Note that either operand could evaluate to a FutureValue, for handling async operation
            return leftReference.getValue().modulo(rightReference.getValue());
        },

        moduloWith: function (targetReference, sourceReference) {
            targetReference.moduloWith(sourceReference.getValue());
        },

        /**
         * Multiplies two Values together, returning the result wrapped as a Value
         *
         * Used by the `*` operator
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        multiply: function (leftReference, rightReference) {
            return leftReference.getValue().multiplyBy(rightReference.getValue());
        },

        /**
         * Multiplies the value of the target reference by the source reference's value,
         * then writes the result back to the target reference
         *
         * Used by the `*=` operator
         *
         * @param {Reference|Value|Variable} targetReference
         * @param {Reference|Value|Variable} sourceReference
         * @returns {Value}
         */
        multiplyBy: function (targetReference, sourceReference) {
            // The result of an assignment is the value assigned. Also note that either operand
            // could evaluate to a FutureValue, for handling async operation
            return targetReference.setValue(targetReference.getValue().multiplyBy(sourceReference.getValue()));
        },

        /**
         * Negates the current value arithmetically, inverting its sign and returning
         * either a FloatValue or IntegerValue as appropriate
         *
         * @param {Reference|Value|Variable} reference
         * @returns {FloatValue|FutureValue|IntegerValue}
         */
        negate: function (reference) {
            return reference.getValue().negate();
        },

        /**
         * Returns a special opcode handler function that is then passed the reference to return if set
         * (left operand) and the reference to return otherwise (right operand).
         * Errors will be suppressed (as "??" may be used to test undefined variables, etc.)
         * and the result will be wrapped as a BooleanValue.
         *
         * Used by the null-coalescing "... ?? ..." construct.
         *
         * @returns {Function}
         */
        nullCoalesce: function () {
            var scope = callStack.getCurrentScope();

            scope.suppressOwnErrors();

            // The returned function must be treated as a separate opcode, as if there is a pause
            // its result must be stored in the trace and not applied to the parent opcode (eg. setValue)
            return opcodeHandlerFactory.createTracedHandler(
                /**
                 * Return a function that accepts the references while we have errors suppressed (see above)
                 *
                 * @param {Reference|Value|Variable} leftReference
                 * @param {Reference|Value|Variable} rightReference
                 * @returns {FutureValue|Value}
                 */
                function (leftReference, rightReference) {
                    // This may return a FutureValue if the reference has an accessor that pauses,
                    // eg. an AccessorReference, a reference to an instance property
                    // that is handled by a magic __get() method or an ArrayAccess element
                    return valueFactory.coerce(leftReference.isSet())
                        .next(function (leftIsSetValue) {
                            var leftIsSet = leftIsSetValue.getNative();

                            scope.unsuppressOwnErrors();

                            return leftIsSet ? leftReference.getValue() : rightReference.getValue();
                        });
                },
                'calculation'
            );
        },

        onesComplement: function (reference) {
            /*jshint bitwise: false */
            return reference.getValue().onesComplement();
        },

        /**
         * Decrements the stored value, returning its original value.
         *
         * @param {Reference} reference
         * @returns {Value}
         */
        postDecrement: function (reference) {
            var originalValue = reference.getValue(),
                decrementedValue = originalValue.decrement();

            return reference.setValue(decrementedValue)
                .next(function () {
                    return originalValue;
                })
                .asValue();
        },

        /**
         * Increments the stored value, returning its original value.
         *
         * @param {Reference} reference
         * @returns {Value}
         */
        postIncrement: function (reference) {
            var originalValue = reference.getValue(),
                incrementedValue = originalValue.increment();

            return reference.setValue(incrementedValue)
                .next(function () {
                    return originalValue;
                })
                .asValue();
        },

        /**
         * Decrements the stored value, returning its new value.
         *
         * @param {Reference} reference
         * @returns {Value}
         */
        preDecrement: function (reference) {
            var decrementedValue = reference.getValue().decrement();

            return reference.setValue(decrementedValue)
                .next(function () {
                    return decrementedValue;
                })
                .asValue();
        },

        /**
         * Increments the stored value, returning its new value
         *
         * @param {Reference} reference
         * @returns {Value}
         */
        preIncrement: function (reference) {
            var incrementedValue = reference.getValue().increment();

            return reference.setValue(incrementedValue)
                .next(function () {
                    return incrementedValue;
                })
                .asValue();
        },

        /**
         * Writes the given value to output.
         *
         * @param {Reference|Value|Variable} textReference
         * @returns {FutureValue<IntegerValue>} Print statements always return int(1)
         */
        print: function (textReference) {
            return textReference.getValue().coerceToString().next(function (textValue) {
                var text = textValue.getNative();

                output.write(text);

                return valueFactory.createInteger(1); // Print statements always return int(1).
            });
        },

        /**
         * Writes the given string to output. Used by transpiled inline HTML snippets.
         *
         * @param {string} text
         */
        printRaw: function (text) {
            output.write(text);
        },

        // /**
        //  * Pushes a value or reference onto the given array. Returns the pushed value
        //  * (even if a reference was pushed).
        //  *
        //  * @param {Reference|Value|Variable} arrayReference
        //  * @param {Reference|Value|Variable} valueReference
        //  * @returns {Value}
        //  */
        // push: function (arrayReference, valueReference) {
        //     var pushElement;
        //
        //     // Undefined variables/references and those containing null may be implicitly converted to arrays
        //     if (!arrayReference.isDefined() || arrayReference.getValue().getType() === 'null') {
        //         arrayReference.setValue(valueFactory.createArray([]));
        //     }
        //
        //     pushElement = arrayReference.getValue().getPushElement();
        //
        //     return valueReference.setAsValueOrReferenceOf(pushElement);
        // },

        /**
         * Fetches a push element for the given array, so that a value or reference may be pushed onto it.
         *
         * @param {Reference|Value|Variable} arrayReference
         * @returns {Future<ElementReference>}
         */
        pushElement: function (arrayReference) {
            return internals.implyArray(arrayReference)
                .asFuture() // Do not wrap result as a value, we expect to resolve with an (object)element reference.
                .next(function (arrayValue) {
                    return arrayValue.getPushElement();
                });
        },

        /**
         * Includes the specified module, returning its return value.
         * Throws if no include transport has been configured.
         * Raises a fatal error if the module cannot be found.
         *
         * @param {Reference|Value|Variable} includedPathReference
         * @returns {Value}
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        require: function (includedPathReference) {
            var enclosingScope = callStack.getCurrentScope(),
                moduleScope = callStack.getCurrentModuleScope();

            return includedPathReference.getValue().next(function (includedPathValue) {
                var includedPath = includedPathValue.getNative(); // Guaranteed to be present by this point.

                return includer.include(
                    'require',
                    PHPError.E_ERROR, // For requires, a fatal error is raised on failure
                    moduleScope.getEnvironment(),
                    moduleScope.getModule(),
                    includedPath,
                    enclosingScope,
                    optionSet.getOptions()
                );
            });
        },

        /**
         * Includes the specified module if it has not been included yet.
         * If it has not already been included, the module's return value is returned,
         * otherwise boolean true will be returned.
         * Throws if no include transport has been configured.
         * Raises a fatal error if the module cannot be found.
         *
         * @param {Reference|Value|Variable} includedPathReference
         * @returns {Value}
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        requireOnce: function (includedPathReference) {
            var enclosingScope = callStack.getCurrentScope(),
                moduleScope = callStack.getCurrentModuleScope();

            return includedPathReference.getValue().next(function (includedPathValue) {
                var includedPath = includedPathValue.getNative(); // Guaranteed to be present by this point.

                return onceIncluder.includeOnce(
                    'require_once',
                    PHPError.E_ERROR, // For requires, a fatal error is raised on failure
                    moduleScope.getEnvironment(),
                    moduleScope.getModule(),
                    includedPath,
                    enclosingScope,
                    optionSet.getOptions()
                );
            });
        },

        setReference: function (targetReference, sourceReference) {
            var reference = sourceReference.getReference();

            targetReference.setReference(reference);

            // TODO: Check this is valid - we may need to detect where a reference-assignment is read
            //       at transpiler stage and output a getValue(...) call
            return reference.getValue();
        },

        setReferenceOrValue: function (targetReference, sourceReference) {
            if (valueFactory.isValue(sourceReference)) {
                return targetReference.setValue(sourceReference);
            }

            return targetReference.setReference(sourceReference);
        },

        /**
         * Sets the value of the target reference to that of the source reference,
         * returning the assigned value. Note that if the assignment happens asynchronously,
         * a FutureValue may be returned which will then be awaited.
         *
         * Used by the assignment operators "=", ".=" etc.
         *
         * @param {Reference|Value|Variable} targetReference
         * @param {Reference|Value|Variable} sourceReference
         * @returns {Value}
         */
        setValue: function (targetReference, sourceReference) {
            // The result of an assignment is the value assigned. Assignments can also involve
            // async behaviour so we need to return the result in case it is a FutureValue.
            return targetReference.setValue(sourceReference.getValue());
        },

        shiftLeft: function (leftReference, rightReference) {
            return leftReference.getValue().shiftLeft(rightReference.getValue());
        },

        /**
         * Bitwise-shifts this reference's value left by the given right reference's value,
         * writing the result back to the left reference
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        shiftLeftBy: function (leftReference, rightReference) {
            return leftReference.setValue(leftReference.getValue().shiftLeft(rightReference.getValue()));
        },

        shiftRight: function (leftReference, rightReference) {
            return leftReference.getValue().shiftRight(rightReference.getValue());
        },

        /**
         * Bitwise-shifts this reference's value right by the given right reference's value,
         * writing the result back to the left reference
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        shiftRightBy: function (leftReference, rightReference) {
            return leftReference.setValue(leftReference.getValue().shiftRight(rightReference.getValue()));
        },

        /**
         * Subtracts a Value from another, returning the result wrapped as a Value
         *
         * @param {Reference|Value|Variable} leftReference
         * @param {Reference|Value|Variable} rightReference
         * @returns {Value}
         */
        subtract: function (leftReference, rightReference) {
            return leftReference.getValue().subtract(rightReference.getValue());
        },

        /**
         * Returns a special opcode handler function that is then passed the reference to evaluate
         * with errors suppressed.
         *
         * Used by the error control "@..." operator.
         *
         * @returns {Function}
         */
        suppressErrors: function () {
            var scope = callStack.getCurrentScope();

            scope.suppressErrors();

            // The returned function must be treated as a separate opcode, as if there is a pause
            // its result must be stored in the trace and not applied to the parent opcode (eg. setValue)
            return opcodeHandlerFactory.createTracedHandler(
                /**
                 * Return a function that accepts the reference while we have errors suppressed (see above)
                 *
                 * @param {Reference|Value|Variable} reference
                 * @returns {Value}
                 */
                function (reference) {
                    // This may pause if the reference has an accessor that pauses, eg. an AccessorReference
                    // or a reference to an instance property that is handled by a magic __get() method
                    return reference.getValue()
                        .finally(function () {
                            scope.unsuppressErrors();
                        });
                },
                'calculation'
            );
        },

        /**
         * Calls the configured tick handler with the current statement's position data.
         * PHPToJS inserts calls to this method when ticking is enabled.
         *
         * @param {number} startLine
         * @param {number} startColumn
         * @param {number} endLine
         * @param {number} endColumn
         * @returns {FutureValue=}
         * @throws {Exception} When no tick handler has been configured
         */
        tick: function (startLine, startColumn, endLine, endColumn) {
            var tickFunction = optionSet.getOption(TICK_OPTION);

            if (!tickFunction) {
                throw new Exception('tick(...) :: No "' + TICK_OPTION + '" handler option is available.');
            }

            // Return the result of calling the tick handler, in case it returns a FutureValue
            // for pausing execution. Note that any other returned value will have no effect,
            // as the tick call itself is not passed as an argument to any other opcode.
            return tickFunction(
                callStack.getCurrentModuleScope().getNormalisedPath(),
                startLine,
                startColumn,
                endLine,
                endColumn
            );
        },

        /**
         * Unsets all the given references (except static properties, for which it is illegal).
         *
         * @param {Reference[]|Value[]|Variable[]} references
         * @returns {Future}
         */
        unset: function (references) {
            return flow.eachAsync(references, function (reference) {
                return reference.unset();
            });
        }
    };
};
