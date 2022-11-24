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
         * Adds two Values together, returning the result wrapped as a Value.
         *
         * Used by the `+` operator.
         */
        add: internals.typeHandler('val left, val right : val', function (leftValue, rightValue) {
            return leftValue.add(rightValue);
        }),

        /**
         * Moves the iterator to the next position.
         *
         * @param {ArrayIterator|ObjectValue} iterator
         * @returns {ChainableInterface<Value>|undefined}
         */
        advance: function (iterator) {
            return iterator.advance();
        },

        /**
         * Bitwise-ANDs two Values together, returning the result wrapped as a Value.
         *
         * Used by the `&` operator.
         */
        bitwiseAnd: internals.typeHandler('val left, val right : val', function (leftValue, rightValue) {
            return leftValue.bitwiseAnd(rightValue);
        }),

        /**
         * Bitwise-ANDs two Values together, writing the result back to the source operand.
         *
         * Used by the `&=` operator.
         */
        bitwiseAndWith: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                var targetValue = targetReference.getValue();

                // The result of an assignment is the value assigned.
                return targetReference.setValue(targetValue.bitwiseAnd(sourceValue));
            }
        ),

        /**
         * Bitwise-ORs two Values together, returning the result wrapped as a Value.
         *
         * Used by the `|` operator.
         */
        bitwiseOr: internals.typeHandler('val left, val right : val', function (leftValue, rightValue) {
            return leftValue.bitwiseOr(rightValue);
        }),

        /**
         * Bitwise-ORs two Values together, writing the result back to the target operand.
         *
         * Used by the `|=` operator.
         */
        bitwiseOrWith: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                var targetValue = targetReference.getValue();

                // The result of an assignment is the value assigned.
                return targetReference.setValue(targetValue.bitwiseOr(sourceValue));
            }
        ),

        /**
         * Bitwise-XORs two Values together, returning the result wrapped as a Value.
         *
         * Used by the `^` operator.
         */
        bitwiseXor: internals.typeHandler('val left, val right : val', function (leftValue, rightValue) {
            return leftValue.bitwiseXor(rightValue);
        }),

        /**
         * Bitwise-XORs two Values together, writing the result back to the target operand.
         *
         * Used by the `^=` operator.
         */
        bitwiseXorWith: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                // The result of an assignment is the value assigned.
                return targetReference.setValue(targetReference.getValue().bitwiseXor(sourceValue));
            }
        ),

        /**
         * Calls a PHP function where the name is known statically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * Used by "my_function(...)" syntax.
         */
        callFunction: internals.typeHandler(
            'string name, snapshot ...argReferences : ref|val',
            function (name, argReferences) {
                var namespaceScope = callStack.getCurrentNamespaceScope(),
                    barewordString = valueFactory.createBarewordString(name, namespaceScope);

                return barewordString.call(argReferences);
            }
        ),

        /**
         * Calls a PHP instance method where the name is known statically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * Used by "$myObject->myMethod(...)" syntax.
         */
        callInstanceMethod: internals.typeHandler(
            'val object, string method, snapshot ...argReferences : ref|val',
            function (objectValue, methodName, argReferences) {
                return objectValue.callMethod(methodName, argReferences);
            }
        ),

        /**
         * Calls a static method of a class.
         *
         * Used by "MyClass::myMethod(...)" syntax.
         */
        callStaticMethod: internals.typeHandler(
            'val class, string method, bool isForwarding, snapshot ...argReferences : ref|val',
            function (classValue, methodName, isForwarding, argReferences) {
                // TODO: Remove need for wrapping this as a *Value
                var methodValue = valueFactory.createString(methodName);

                return classValue.callStaticMethod(methodValue, argReferences, isForwarding);
            }
        ),

        /**
         * Calls a PHP function where the name is fetched dynamically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * Used by "$myObject->$myMethodName(...)" syntax.
         */
        callVariableFunction: internals.typeHandler(
            'val name, snapshot ...argReferences : ref|val',
            function (nameValue, argReferences) {
                // NB: Make sure we do not coerce argument references to their values,
                //     in case any of the parameters are passed by reference.
                return nameValue.call(argReferences);
            }
        ),

        /**
         * Calls a method of an object where the name is fetched dynamically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * Used by "$myObject->$myMethod(...)" syntax.
         */
        callVariableInstanceMethod: internals.typeHandler(
            'val object, val methodName, snapshot ...argReferences : ref|val',
            function (objectValue, methodNameValue, argReferences) {
                var methodName = methodNameValue.getNative();

                return objectValue.callMethod(methodName, argReferences);
            }
        ),

        /**
         * Calls a static method of a class where the name is fetched dynamically, returning its result
         * as a Value if it returns by-value or as a Reference if it returns by-reference.
         *
         * Used by "MyClass::$myMethodName(...)" syntax.
         */
        callVariableStaticMethod: internals.typeHandler(
            'val class, val methodName, bool isForwarding, snapshot ...argReferences : ref|val',
            function (classNameValue, methodNameValue, isForwarding, argReferences) {
                return classNameValue.callStaticMethod(methodNameValue, argReferences, isForwarding);
            }
        ),

        /**
         * Clones the given ObjectValue.
         *
         * Used by "clone $myObject" syntax.
         */
        clone: internals.typeHandler('val object : val', function (objectValue) {
            return objectValue.clone();
        }),

        /**
         * Casts the given value to array.
         *
         * Used by "(array) $myVar" syntax.
         */
        coerceToArray: internals.typeHandler('val value : val', function (value) {
            return value.coerceToArray();
        }),

        /**
         * Casts the given value to boolean.
         *
         * Used by "(bool) $myVar" and "(boolean) $myVar" syntax.
         */
        coerceToBoolean: internals.typeHandler('val value : val', function (value) {
            return value.coerceToBoolean();
        }),

        /**
         * Casts the given value to float.
         *
         * Used by "(double) $myVar", "(float) $myVar" and "(real) $myVar" syntax.
         */
        coerceToFloat: internals.typeHandler('val value : val', function (value) {
            return value.coerceToFloat();
        }),

        /**
         * Casts the given value to integer.
         *
         * Used by "(int) $myVar" and "(integer) $myVar" syntax.
         */
        coerceToInteger: internals.typeHandler('val value : val', function (value) {
            return value.coerceToInteger();
        }),

        /**
         * Casts the given value to object.
         *
         * Used by "(object) $myVar" syntax.
         */
        coerceToObject: internals.typeHandler('val value : val', function (value) {
            return value.coerceToObject();
        }),

        /**
         * Casts the given value to string.
         *
         * Used by "(string) $myVar" syntax.
         */
        coerceToString: internals.typeHandler('val value : val', function (value) {
            return value.coerceToString();
        }),

        /**
         * Concatenates two Values together, returning the result wrapped as a Value.
         *
         * Used by the "." operator.
         */
        concat: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.concat(rightValue);
            }
        ),

        /**
         * Coerces the value from this reference and the specified one to strings,
         * concatenates them together and then assigns the result back to the target operand.
         *
         * Used by the ".=" operator.
         */
        concatWith: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                var targetValue = targetReference.getValue();

                return targetReference.setValue(targetValue.concat(sourceValue));
            }
        ),

        /**
         * Creates an ArrayValue with the given elements.
         *
         * Used by array literal syntax "[...]".
         */
        createArray: internals.typeHandler(
            'snapshot ...elements : val',
            function (elementSnapshots) {
                return valueProvider.createFutureArray(elementSnapshots);
            }
        ),

        /**
         * Creates a BarewordStringValue.
         *
         * Used by bareword syntax, e.g. "MyClass::...".
         */
        createBareword: function (nativeValue) {
            var namespaceScope = callStack.getCurrentNamespaceScope();

            return valueFactory.createBarewordString(nativeValue, namespaceScope);
        },

        /**
         * Creates a BooleanValue.
         *
         * Used by boolean literals, "true" and "false".
         */
        createBoolean: internals.typeHandler('bool native : val', function (nativeValue) {
            return valueFactory.createBoolean(nativeValue);
        }),

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

        /**
         * Creates a FloatValue.
         *
         * Used by float literals, e.g. "123.456".
         */
        createFloat: internals.typeHandler('number native : val', function (nativeValue) {
            return valueFactory.createFloat(nativeValue);
        }),

        /**
         * Used by transpiled PHP `new MyClass(<args>)` expressions.
         *
         * @param {Value[]} args Arguments to pass to the constructor.
         * @returns {ChainableInterface<ObjectValue>}
         */
        createInstance: internals.typeHandler(
            'val className, snapshot ...args : val',
            function (classNameValue, args) {
                return classNameValue.instantiate(args);
            }
        ),

        /**
         * Creates an IntegerValue.
         *
         * Used by integer literals, e.g. "456".
         */
        createInteger: internals.typeHandler('number native : val', function (nativeValue) {
            return valueFactory.createInteger(nativeValue);
        }),

        /**
         * Creates a KeyReferencePair.
         *
         * Used by array literal syntax, e.g. "$myArray = ['my_key' => &$myByRefValue]".
         */
        createKeyReferencePair: internals.typeHandler(
            'val key, ref reference',
            function (keyValue, reference) {
                return new KeyReferencePair(
                    keyValue,
                    // Reference may not be a ReferenceSlot (if applicable), so we must ensure it like this.
                    reference.getReference()
                );
            }
        ),

        /**
         * Creates a KeyValuePair.
         *
         * Used by array literal syntax, e.g. "$myArray = ['my_key' => $myByValValue]".
         */
        createKeyValuePair: internals.typeHandler(
            'val key, val value',
            function (keyValue, value) {
                return new KeyValuePair(keyValue, value);
            }
        ),

        /**
         * Creates a new List, which is a list of references that may be assigned to
         * by assigning them an array, where each list element gets the corresponding array element
         *
         * Used by list syntax "list(...) = ...".
         */
        createList: internals.typeHandler(
            'snapshot ...elements : list',
            function (elementSnapshots) {
                return new List(valueFactory, flow, elementSnapshots);
            }
        ),

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

        /**
         * Creates a StringValue.
         *
         * Used by string literals, e.g. "'my string'".
         */
        createString: internals.typeHandler('string native : val', function (nativeValue) {
            return valueFactory.createString(nativeValue);
        }),

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
         * then writes the result back to the target reference.
         *
         * Used by the `-=` operator.
         */
        decrementBy: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                // The result of an assignment is the value assigned.
                return targetReference.setValue(targetReference.getValue().subtract(sourceValue));
            }
        ),

        /**
         * Divides a Value by another, returning the result wrapped as a Value.
         *
         * Used by the `/` operator.
         */
        divide: internals.typeHandler('val left, val right : val', function (leftValue, rightValue) {
            return leftValue.divideBy(rightValue);
        }),

        /**
         * Divides the value of the target reference by the source reference's value,
         * then writes the result back to the target reference.
         *
         * Used by the `/=` operator.
         */
        divideBy: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                // The result of an assignment is the value assigned.
                return targetReference.setValue(targetReference.getValue().divideBy(sourceValue));
            }
        ),

        /**
         * Writes the given value to output. Note that unlike print() there is no return value.
         *
         * Used by the "echo ...;" statement.
         */
        echo: internals.typeHandler('val text', function (textValue) {
            return textValue.coerceToString().next(function (textAsStringValue) {
                var text = textAsStringValue.getNative(); // Guaranteed to be present by this point.

                output.write(text);
            });
        }),

        /**
         * Evaluates the given PHP code using the configured `eval` option.
         *
         * Used by the `eval(...)` construct.
         */
        eval: internals.typeHandler('val code', function (codeValue) {
            var code = codeValue.getNative();

            return evaluator.eval(code, callStack.getCurrentModuleScope().getEnvironment());
        }),

        /**
         * Fetches a constant of the given class.
         *
         * Used by `::CLASS_NAME`.
         */
        getClassConstant: internals.typeHandler(
            'val className, string constantName : val',
            function (classNameValue, constantName) {
                return classNameValue.getConstantByName(constantName);
            }
        ),

        /**
         * Fetches the name of the current class, or an empty string if there is none
         *
         * Used by `self::` inside property or constant definitions and by `__CLASS__`.
         *
         * @returns {StringValue}
         */
        getClassName: function () {
            return callStack.getCurrentScope().getClassName();
        },

        /**
         * Fetches the name of the class in which the current scope's function is defined
         *
         * Used by `self::` inside methods.
         *
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no current class scope
         */
        getClassNameOrThrow: function () {
            return callStack.getCurrentScope().getClassNameOrThrow();
        },

        /**
         * Fetches the value of a constant in the current NamespaceScope.
         *
         * Used by `BAREWORD_CONSTANT` syntax.
         */
        getConstant: internals.typeHandler('string name : val', function (name) {
            var namespaceScope = callStack.getCurrentNamespaceScope();

            return namespaceScope.getConstant(name);
        }),

        /**
         * Fetches a constant of the current class.
         *
         * Used by static property initialisers and class constants.
         *
         * @param {Class} currentClass
         */
        getCurrentClassConstant: internals.typeHandler(
            // TODO: Add a "Class" opcode parameter type?
            'any currentClass, string constantName : val',
            function (currentClass, constantName) {
                return currentClass.getConstantByName(constantName);
            }
        ),

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
         * @returns {ChainableInterface<ElementReference|ReferenceSnapshot>}
         */
        getElement: internals.typeHandler(
            'ref|val array, any nativeKey : ref',
            function (arrayReference, nativeKey) {
                // TODO: Remove need for this to be wrapped as a Value.
                var keyValue = valueFactory.coerce(nativeKey);

                return internals.implyArray(arrayReference)
                    .next(function (arrayValue) {
                        return arrayValue.getElementByKey(keyValue);
                    });
            }
        ),

        /**
         * Fetches the name of the current function, or an empty string if there is none
         *
         * @returns {StringValue}
         */
        getFunctionName: function () {
            return callStack.getCurrentScope().getFunctionName();
        },

        /**
         * Fetches an instance property of a class instance.
         *
         * Used by `$object->myPropertyName` object access operator.
         *
         * @returns {ChainableInterface<Property|ReferenceSnapshot>}
         */
        getInstanceProperty: internals.typeHandler(
            'val object, string propertyName : ref',
            function (objectValue, propertyName) {
                // TODO: Remove need for this to be wrapped as a StringValue.
                var propertyNameValue = valueFactory.createString(propertyName);

                return objectValue.getInstancePropertyByName(propertyNameValue);
            }
        ),

        /**
         * Fetches the name of the current method, or an empty string if there is none
         *
         * @returns {StringValue}
         */
        getMethodName: function () {
            return callStack.getCurrentScope().getMethodName();
        },

        /**
         * Fetches the name of the current namespace.
         *
         * @returns {StringValue}
         */
        getNamespaceName: function () {
            return callStack.getCurrentNamespaceScope().getNamespaceName();
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
         * from the class in which its function is defined (e.g. after a forward_static_call(...)).
         *
         * Used by `static::`.
         *
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no static class scope
         */
        getStaticClassName: function () {
            var scope = callStack.getCurrentScope();

            return scope.getStaticClassNameOrThrow();
        },

        /**
         * Fetches a static property of a class.
         *
         * @returns {ChainableInterface<ReferenceSnapshot|StaticPropertyReference>}
         */
        getStaticProperty: internals.typeHandler(
            'val className, string propertyName : ref',
            function (classValue, propertyName) {
                // TODO: Remove need for this to be wrapped as a StringValue.
                var propertyNameValue = valueFactory.createString(propertyName);

                return classValue.getStaticPropertyByName(propertyNameValue);
            }
        ),

        /**
         * Fetches the name of the parent class.
         *
         * Used by `parent::` inside property or constant definitions.
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
         * Fetches the name of the parent of the class in which the current scope's function is defined.
         *
         * Used by `parent::` inside methods.
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
         */
        getValueBinding: internals.typeHandler(
            'string name : val',
            function (name) {
                var scope = callStack.getCurrentScope();

                return scope.getValueBinding(name);
            }
        ),

        /**
         * Fetches a variable with the given name.
         *
         * @returns {ChainableInterface<Reference|Variable>}
         */
        getVariable: internals.typeHandler('string name', function (name) {
            return callStack.getCurrentScope().getVariable(name);
        }),

        /**
         * Fetches an array element where the key is calculated dynamically.
         *
         * Used by `$myArray[$myVar * 21]` syntax.
         *
         * @returns {ChainableInterface<ElementReference>}
         */
        getVariableElement: internals.typeHandler(
            'snapshot array, val key : ref',
            function (arrayReference, keyValue) {
                return internals.implyArray(arrayReference)
                    .next(function (arrayValue) {
                        return arrayValue.getElementByKey(keyValue);
                    });
            }
        ),

        /**
         * Fetches a variable from the enclosing scope. Used by closures when binding variables
         * from the parent scope into the closure with "use (...)".
         *
         * @param {string} name
         * @param {Scope} scope
         * @returns {ChainableInterface<Reference|Variable>}
         */
        getVariableForScope: function (name, scope) {
            return scope.getVariable(name);
        },

        /**
         * Fetches an instance property of the given reference's value
         * (assuming it contains an object) by its name.
         *
         * Used by `$myObject->{$myVar . 'suffix'}` syntax.
         *
         * @returns {ChainableInterface<PropertyReference>}
         */
        getVariableInstanceProperty: internals.typeHandler(
            'val object, val propertyName : ref',
            function (objectValue, propertyNameValue) {
                return objectValue.getInstancePropertyByName(propertyNameValue);
            }
        ),

        /**
         * Fetches a static property of the given reference's value (assuming it contains an object or FQCN string) by its name
         *
         * Used by `$myObject::{$myVar . 'suffix'}` syntax.
         *
         * @returns {ChainableInterface<StaticPropertyReference>}
         */
        getVariableStaticProperty: internals.typeHandler(
            'val object, val propertyName : ref',
            function (objectValue, propertyNameValue) {
                return objectValue.getStaticPropertyByName(propertyNameValue);
            }
        ),

        /**
         * Fetches a variable from the current scope with the name specified by the given variable
         * (note this is a dynamic lookup).
         *
         * Used by the `$$myVarName` and `${$myVarName}` constructs.
         *
         * @returns {ChainableInterface<Variable>}
         */
        getVariableVariable: internals.typeHandler(
            'val name',
            function (nameValue) {
                return callStack.getCurrentScope()
                    .getVariable(nameValue.getNative());
            }
        ),

        /**
         * Coerces the value to a float or int as appropriate.
         *
         * Used by the `+$val` operator.
         */
        identity: internals.typeHandler('val value', function (value) {
            return value.coerceToNumber();
        }),

        /**
         * Imports a global variable into the current scope.
         *
         * Used by the "global $myVar;" statement.
         */
        importGlobal: internals.typeHandler('string name', function (name) {
            callStack.getCurrentScope().importGlobal(name);
        }),

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
         * Used by `$export = include 'my_script.php';` syntax.
         *
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        include: internals.typeHandler('val path : val', function (includedPathValue) {
            var enclosingScope = callStack.getCurrentScope(),
                moduleScope = callStack.getCurrentModuleScope(),
                includedPath = includedPathValue.getNative();

            return includer.include(
                'include',
                PHPError.E_WARNING, // For includes, only a warning is raised on failure.
                moduleScope.getEnvironment(),
                moduleScope.getModule(),
                includedPath,
                enclosingScope,
                optionSet.getOptions()
            );
        }),

        /**
         * Includes the specified module if it has not been included yet.
         * If it has not already been included, the module's return value is returned,
         * otherwise boolean true will be returned.
         * Throws if no include transport has been configured.
         *
         * Used by `$export = include_once 'my_script.php';` syntax.
         *
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        includeOnce: internals.typeHandler('val path : val', function (includedPathValue) {
            var enclosingScope = callStack.getCurrentScope(),
                moduleScope = callStack.getCurrentModuleScope(),
                includedPath = includedPathValue.getNative(); // Guaranteed to be present by this point.

            return onceIncluder.includeOnce(
                'include_once',
                PHPError.E_WARNING, // For includes, only a warning is raised on failure.
                moduleScope.getEnvironment(),
                moduleScope.getModule(),
                includedPath,
                enclosingScope,
                optionSet.getOptions()
            );
        }),

        /**
         * Adds the value of the source reference to the target reference's value,
         * then writes the result back to the target reference.
         *
         * Used by `$myVar += 21` syntax.
         */
        incrementBy: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                // The result of an assignment is the value assigned. Also note that either operand
                // could evaluate to a Future, for handling async operation.
                return targetReference.setValue(targetReference.getValue().add(sourceValue));
            }
        ),

        /**
         * Determines whether the object is an instance of the given class.
         *
         * Used by `$myObject instanceof $myClassName` syntax.
         *
         * @returns {BooleanValue}
         */
        instanceOf: internals.typeHandler(
            'val object, val className : val',
            function (objectValue, classNameValue) {
                return objectValue.isAnInstanceOf(classNameValue);
            }
        ),

        /**
         * Combines parts of a string containing reference interpolations.
         *
         * Used by both string interpolations ("my string $here") and heredocs.
         *
         * @param {Reference[]|Value[]|Variable[]} references
         * @returns {ChainableInterface<StringValue>}
         */
        interpolate: internals.typeHandler(
            'any references : val',
            function (references) {
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
                            .next(function (value) {
                                // ... and coerce to string values, allowing for pauses
                                //     (eg. __toString() methods that pause).
                                return value.coerceToString();
                            });
                    }
                ).next(function (stringParts) {
                    // Convert all values to native strings, concatenate everything together
                    // and build the final string value.
                    return valueFactory.createString(
                        _.map(stringParts, function (stringPart) {
                            // We handle the common case of string literal fragments specially,
                            // by embedding the primitive string literal, to save on bundle size.
                            return typeof stringPart === 'string' ?
                                stringPart :
                                stringPart.getNative();
                        })
                            .join('')
                    );
                });
            }
        ),

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
                 * @returns {ChainableInterface<Value>}
                 */
                function (reference) {
                    var isEmpty = reference.isEmpty();

                    // Note that .isEmpty() could return a Future, in which case
                    // .coerce() will wrap it to a Future-wrapped Value.
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
         * Used by `$var1 == $var2` expressions.
         *
         * @returns {ChainableInterface<BooleanValue>}
         */
        isEqual: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.isEqualTo(rightValue);
            }
        ),

        /**
         * Determines whether the left operand is greater than the right one.
         * The result will be wrapped as a BooleanValue.
         *
         * Used by `$var1 > $var2` expressions.
         *
         * @returns {BooleanValue}
         */
        isGreaterThan: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.isGreaterThan(rightValue);
            }
        ),

        /**
         * Determines whether the left operand is greater than or equal to the right one.
         * The result will be wrapped as a BooleanValue.
         *
         * Used by `$var1 >= $var2` expressions.
         *
         * @returns {BooleanValue}
         */
        isGreaterThanOrEqual: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.isGreaterThanOrEqual(rightValue);
            }
        ),

        /**
         * Determines whether two operands are identical (same type and value).
         * The result will be wrapped as a BooleanValue.
         *
         * Used by `$var1 === $var2` expressions.
         *
         * @returns {BooleanValue}
         */
        isIdentical: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.isIdenticalTo(rightValue);
            }
        ),

        /**
         * Determines whether the left operand is less than the right one.
         * The result will be wrapped as a BooleanValue.
         *
         * Used by `$var1 < $var2` expressions.
         *
         * @returns {BooleanValue}
         */
        isLessThan: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.isLessThan(rightValue);
            }
        ),

        /**
         * Determines whether the left operand is less than or equal to the right one.
         * The result will be wrapped as a BooleanValue.
         *
         * Used by `$var1 <= $var2` expressions.
         *
         * @returns {BooleanValue}
         */
        isLessThanOrEqual: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.isLessThanOrEqual(rightValue);
            }
        ),

        /**
         * Determines whether two operands are not equal.
         * The result will be wrapped as a BooleanValue.
         *
         * Used by `$var1 != $var2` expressions.
         *
         * @returns {BooleanValue}
         */
        isNotEqual: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.isNotEqualTo(rightValue);
            }
        ),

        /**
         * Determines whether two operands are not identical (differ in type and/or value).
         * The result will be wrapped as a BooleanValue.
         *
         * Used by `$var1 !== $var2` expressions.
         *
         * @returns {BooleanValue}
         */
        isNotIdentical: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.isNotIdenticalTo(rightValue);
            }
        ),

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
                        // This may return a Future if the reference has an accessor that pauses,
                        // e.g. an AccessorReference, a reference to an instance property
                        // that is handled by a magic __get() method or an ArrayAccess element.
                        return valueFactory.coerce(reference.isSet())
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
         * Coerces to boolean and then inverts the given reference's value.
         *
         * Used by `!$myVar` expressions.
         *
         * @returns {BooleanValue}
         */
        logicalNot: internals.typeHandler('val value : val', function (value) {
            return value.logicalNot();
        }),

        /**
         * Xor should be true if LHS is not equal to RHS:
         * coerce to booleans then compare for inequality.
         *
         * Used by `$left xor $right` expressions.
         *
         * @returns {BooleanValue}
         */
        logicalXor: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                // FIXME: Implement Value.logicalXor(...)!
                return leftValue.logicalXor(rightValue);
            }
        ),

        /**
         * Calculates the modulo of two values.
         *
         * Used by the `%` operator.
         */
        modulo: internals.typeHandler('val left, val right : val', function (leftValue, rightValue) {
            return leftValue.modulo(rightValue);
        }),

        /**
         * Calculates the modulo of two values, writing the result to the target.
         *
         * Used by the `%=` operator.
         */
        moduloWith: internals.typeHandler(
            'snapshot target, val source',
            function (targetReference, sourceValue) {
                return targetReference.setValue(targetReference.getValue().modulo(sourceValue));
            }
        ),

        /**
         * Multiplies two Values together, returning the result wrapped as a Value.
         *
         * Used by the `*` operator.
         */
        multiply: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.multiplyBy(rightValue);
            }
        ),

        /**
         * Multiplies the value of the target reference by the source reference's value,
         * then writes the result back to the target reference.
         *
         * Used by the `*=` operator.
         */
        multiplyBy: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                return targetReference.setValue(targetReference.getValue().multiplyBy(sourceValue));
            }
        ),

        /**
         * Negates the current value arithmetically, inverting its sign and returning
         * either a FloatValue or IntegerValue as appropriate.
         *
         * Used by `-$myVar` expressions.
         */
        negate: internals.typeHandler('val value: val', function (value) {
            return value.negate();
        }),

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
            // its result must be stored in the trace and not applied to the parent opcode (eg. setValue).
            return opcodeHandlerFactory.createTracedHandler(
                /**
                 * Return a function that accepts the references while we have errors suppressed (see above).
                 *
                 * @param {Reference|Value|Variable} leftReference
                 * @param {Reference|Value|Variable} rightReference
                 * @returns {ChainableInterface<Value>}
                 */
                function (leftReference, rightReference) {
                    // This may return a Future if the reference has an accessor that pauses,
                    // e.g. an AccessorReference, a reference to an instance property
                    // that is handled by a magic __get() method or an ArrayAccess element.
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

        /**
         * Returns the ones' complement of the given value.
         *
         * Used by `~$myVar` expressions.
         */
        onesComplement: internals.typeHandler('val value : val', function (value) {
            return value.onesComplement();
        }),

        /**
         * Decrements the stored value, returning its original value.
         *
         * Used by `$myVar--` expressions.
         */
        postDecrement: internals.typeHandler('snapshot value : val', function (reference) {
            var originalValue = reference.getValue(),
                decrementedValue = originalValue.decrement();

            return reference.setValue(decrementedValue)
                .next(function () {
                    return originalValue;
                });
        }),

        /**
         * Increments the stored value, returning its original value.
         *
         * Used by `$myVar++` expressions.
         */
        postIncrement: internals.typeHandler('snapshot value : val', function (reference) {
            var originalValue = reference.getValue(),
                incrementedValue = originalValue.increment();

            return reference.setValue(incrementedValue)
                .next(function () {
                    return originalValue;
                });
        }),

        /**
         * Decrements the stored value, returning its new value.
         *
         * Used by `--$myVar` expressions.
         */
        preDecrement: internals.typeHandler('snapshot value : val', function (reference) {
            var decrementedValue = reference.getValue().decrement();

            return reference.setValue(decrementedValue)
                .next(function () {
                    return decrementedValue;
                });
        }),

        /**
         * Increments the stored value, returning its new value.
         *
         * Used by `++$myVar` expressions.
         */
        preIncrement: internals.typeHandler('snapshot value : val', function (reference) {
            var incrementedValue = reference.getValue().increment();

            return reference.setValue(incrementedValue)
                .next(function () {
                    return incrementedValue;
                });
        }),

        /**
         * Writes the given value to output.
         *
         * Used by `print $myText` expressions.
         *
         * @returns {ChainableInterface<IntegerValue>} Print statements always return int(1).
         */
        print: internals.typeHandler('val text : val', function (textValue) {
            return textValue.coerceToString().next(function (textStringValue) {
                var text = textStringValue.getNative();

                output.write(text);

                return valueFactory.createInteger(1); // Print statements always return int(1).
            });
        }),

        /**
         * Writes the given string to output. Used by transpiled inline HTML snippets.
         *
         * @param {string} text
         */
        printRaw: function (text) {
            output.write(text);
        },

        /**
         * Fetches a push element for the given array, so that a value or reference may be pushed onto it.
         *
         * Used by "$myArray[] = 123;" syntax.
         *
         * @returns {ChainableInterface<ElementReference>}
         */
        pushElement: internals.typeHandler(
            'ref|val array : ref',
            function (arrayReference) {
                return internals.implyArray(arrayReference)
                    .next(function (arrayValue) {
                        return arrayValue.getPushElement();
                    });
            }
        ),

        /**
         * Includes the specified module, returning its return value.
         * Throws if no include transport has been configured.
         * Raises a fatal error if the module cannot be found.
         *
         * Used by `$export = require 'my_script.php';` syntax.
         *
         * @param {Reference|Value|Variable} includedPathReference
         * @returns {Value}
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        require: internals.typeHandler('val path : val', function (includedPathValue) {
            var enclosingScope = callStack.getCurrentScope(),
                moduleScope = callStack.getCurrentModuleScope(),
                includedPath = includedPathValue.getNative();

            return includer.include(
                'require',
                PHPError.E_ERROR, // For requires, a fatal error is raised on failure.
                moduleScope.getEnvironment(),
                moduleScope.getModule(),
                includedPath,
                enclosingScope,
                optionSet.getOptions()
            );
        }),

        /**
         * Includes the specified module if it has not been included yet.
         * If it has not already been included, the module's return value is returned,
         * otherwise boolean true will be returned.
         * Throws if no include transport has been configured.
         * Raises a fatal error if the module cannot be found.
         *
         * Used by `$export = require_once 'my_script.php';` syntax.
         *
         * @param {Reference|Value|Variable} includedPathReference
         * @returns {Value}
         * @throws {Exception} When no include transport has been configured
         * @throws {Error} When the loader throws a generic error
         */
        requireOnce: internals.typeHandler('val path : val', function (includedPathValue) {
            var enclosingScope = callStack.getCurrentScope(),
                moduleScope = callStack.getCurrentModuleScope(),
                includedPath = includedPathValue.getNative();

            return onceIncluder.includeOnce(
                'require_once',
                PHPError.E_ERROR, // For requires, a fatal error is raised on failure.
                moduleScope.getEnvironment(),
                moduleScope.getModule(),
                includedPath,
                enclosingScope,
                optionSet.getOptions()
            );
        }),

        /**
         * Takes a reference to the source reference or variable and assigns it to the target reference.
         *
         * Used by the reference assignment operator "=&".
         */
        setReference: internals.typeHandler(
            'ref target, ref source : val',
            function (targetReference, sourceReference) {
                var reference = sourceReference.getReference();

                targetReference.setReference(reference);

                // TODO: Check this is valid - we may need to detect where a reference-assignment is read
                //       at transpiler stage and output a getValue(...) call.
                return reference.getValue();
            }
        ),

        /**
         * Sets the value of the target reference to that of the source reference,
         * returning the assigned value. Note that if the assignment happens asynchronously,
         * a Future may be returned which will then be awaited.
         *
         * Used by the assignment operators "=", ".=" etc.
         */
        setValue: internals.typeHandler(
            'ref|list target, val source : val',
            function setValue(targetReference, sourceValue) {
                // The result of an assignment is the value assigned. Assignments can also involve
                // async behaviour, so we need to return the result in case it is a Future.
                return targetReference.setValue(sourceValue);
            }
        ),

        /**
         * Bitwise-shifts the left operand left by the number of bits
         * specified by the right operand and returns the result.
         *
         * Used by the left-shift operator "<<".
         */
        shiftLeft: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.shiftLeft(rightValue);
            }
        ),

        /**
         * Bitwise-shifts the target operand left by the number of bits
         * specified by the source operand, writing the result back to the target reference.
         *
         * Used by the left-shift assignment operator "<<=".
         */
        shiftLeftBy: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                var targetValue = targetReference.getValue();

                return targetReference.setValue(targetValue.shiftLeft(sourceValue));
            }
        ),

        /**
         * Bitwise-shifts the left operand right by the number of bits
         * specified by the right operand and returns the result.
         *
         * Used by the right-shift operator `>>`.
         */
        shiftRight: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.shiftRight(rightValue);
            }
        ),

        /**
         * Bitwise-shifts the target operand right by the number of bits
         * specified by the source operand, writing the result back to the target reference.
         *
         * Used by the right-shift assignment operator `>>=`.
         */
        shiftRightBy: internals.typeHandler(
            'snapshot target, val source : val',
            function (targetReference, sourceValue) {
                var targetValue = targetReference.getValue();

                return targetReference.setValue(targetValue.shiftRight(sourceValue));
            }
        ),

        /**
         * Subtracts a Value from another, returning the result wrapped as a Value.
         *
         * Used by `$var1 - $var2` expressions.
         */
        subtract: internals.typeHandler(
            'val left, val right : val',
            function (leftValue, rightValue) {
                return leftValue.subtract(rightValue);
            }
        ),

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
                 * Return a function that accepts the reference while we have errors suppressed (see above).
                 *
                 * @param {Reference|Value|Variable} reference
                 * @returns {Value}
                 */
                function (reference) {
                    // This may pause if the reference has an accessor that pauses, e.g. an AccessorReference
                    // or a reference to an instance property that is handled by a magic __get() method.
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
         * @throws {Exception} When no tick handler has been configured
         */
        tick: internals.typeHandler(
            'number startLine, number startColumn, number endLine, number endColumn : any',
            function (startLine, startColumn, endLine, endColumn) {
                var tickFunction = optionSet.getOption(TICK_OPTION);

                if (!tickFunction) {
                    throw new Exception('tick(...) :: No "' + TICK_OPTION + '" handler option is available.');
                }

                // Return the result of calling the tick handler, in case it returns a Future
                // for pausing execution. Note that any other returned value will have no effect,
                // as the tick call itself is not passed as an argument to any other opcode.
                return tickFunction(
                    callStack.getCurrentModuleScope().getNormalisedPath(),
                    startLine,
                    startColumn,
                    endLine,
                    endColumn
                );
            }
        ),

        /**
         * Unsets all the given references (except static properties, for which it is illegal).
         *
         * Used by unset constructs, e.g. "unset(...);"
         */
        unset: internals.typeHandler('ref ...references', function (references) {
            return flow.eachAsync(references, function (reference) {
                return reference.unset();
            });
        })
    };
};
