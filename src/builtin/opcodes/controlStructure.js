/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

/**
 * Provides the control flow opcodes for the runtime API that the JS output by the transpiler calls into.
 *
 * When these opcodes are called, calculation opcodes' results may be discarded from the current trace
 * to reduce memory usage, because it is not possible to embed control structures inside an expression
 * (unless a Closure is used, in which case an embedded call trace will be used).
 *
 * @param {OpcodeInternals} internals
 * @constructor
 */
module.exports = function (internals) {
    var callStack = internals.callStack,
        valueFactory = internals.valueFactory;

    internals.setOpcodeFetcher('controlStructure');

    return {
        /**
         * Defines a class transpiled from PHP in the current namespace.
         *
         * @param {string} name
         * @param {object} definition Transpiled class definition object
         * @returns {Future<Class>}
         */
        defineClass: function (name, definition) {
            var namespaceScope = callStack.getCurrentNamespaceScope();

            return namespaceScope.defineClass(name, definition);
        },

        /**
         * Defines a constant in the current namespace
         *
         * @param {string} name
         * @param {Reference|Value|Variable} value
         */
        defineConstant: function (name, reference) {
            var namespaceScope = callStack.getCurrentNamespaceScope(),
                value = reference.getValue();

            namespaceScope.defineConstant(name, value);
        },

        /**
         * Defines a function with the given name for the given NamespaceScope
         *
         * @param {string} name
         * @param {Function} func
         * @param {Array=} parametersSpecData
         * @param {number=} lineNumber
         */
        defineFunction: function (name, func, parametersSpecData, lineNumber) {
            var namespaceScope = callStack.getCurrentNamespaceScope();

            namespaceScope.defineFunction(
                name,
                func,
                parametersSpecData,
                lineNumber
            );
        },

        /**
         * Defines an interface transpiled from PHP in the current namespace.
         *
         * @param {string} name
         * @param {object} definition Transpiled interface definition object
         * @returns {Future<Class>}
         */
        defineInterface: function (name, definition) {
            var namespaceScope = callStack.getCurrentNamespaceScope();

            // TODO: Note that we currently make no distinction between classes and interfaces,
            //       which is required by things like interface_exists(...)
            return namespaceScope.defineClass(name, definition);
        },

        /**
         * Immediately exits the currently executing PHP script. This is achieved
         * by throwing a JS error that cannot be caught by any PHP-land try..catch statement.
         * If the program was run from a command-line, any exit status provided will be used
         * as the exit code for the process.
         *
         * @param {Value|null} statusValue
         * @throws {ExitValue}
         */
        exit: function (statusValue) {
            throw valueFactory.createExit(statusValue);
        },

        /**
         * Handles the condition expression of an if statement, evaluating and coercing it to a native boolean.
         *
         * @param {Reference|Value|Variable} conditionReference
         * @returns {Future<boolean>}
         */
        if_: function (conditionReference) {
            return conditionReference.getValue().coerceToBoolean().asEventualNative();
        },

        /**
         * Handles a case of a switch statement, comparing and coercing the match to a native boolean.
         *
         * @param {Reference|Value|Variable} switchReference
         * @param {Reference|Value|Variable} caseReference
         * @returns {boolean|Future<boolean>}
         */
        switchCase: function (switchReference, caseReference) {
            if (switchReference === null) {
                /*
                 * Special scenario where no non-default case has matched, so we have jumped
                 * back to the top of the switch and are now going back down to the default case
                 * (which may not be the final one).
                 */
                return false;
            }

            return switchReference.getValue().isEqualTo(caseReference.getValue())
                .asEventualNative();
        },

        /**
         * Handles a default case of a switch statement. If a default case is not the final one
         * in a switch, execution will jump back up to it from the bottom of the transpiled switch
         * once all non-default cases have been evaluated. In that scenario, the switch expression
         * variable will have been assigned the special value native null (rather than a Value)
         * indicating that we need to reach the default case.
         *
         * Note that the presence of this opcode also allows:
         * - Resuming a pause inside a non-final default case to be optimised (as resume-execution
         *   would otherwise need to reach the bottom of the switch before jumping back up to the default);
         * - Meta-programming hooks to be installed for when a switch has a default case;
         * - IR inference, e.g. for a JIT.
         *
         * @param {null|Reference|Value|Variable} switchReference
         * @returns {boolean}
         */
        switchDefault: function (switchReference) {
            return switchReference === null;
        },

        /**
         * Handles the expression of a switch statement, evaluating it to a value.
         *
         * @param {Reference|Value|Variable} switchReference
         * @returns {Value}
         */
        switchOn: function (switchReference) {
            return switchReference.getValue();
        },

        /**
         * Imports a class into the current namespace scope, eg. from a PHP `use ...` statement,
         * optionally with an alias
         *
         * @param {string} source
         * @param {string=} alias
         */
        useClass: function (name, alias) {
            var namespaceScope = callStack.getCurrentNamespaceScope();

            return namespaceScope.use(name, alias);
        },

        /**
         * Creates a NamespaceScope for the given descendant namespace of this one, switching to it
         *
         * @param {string} name
         * @returns {NamespaceScope}
         */
        useDescendantNamespaceScope: function (name) {
            return callStack.getCurrentModuleScope().useDescendantNamespaceScope(name);
        },

        /**
         * Creates a NamespaceScope for the global namespace, switching to it
         */
        useGlobalNamespaceScope: function () {
            return callStack.getCurrentModuleScope().useGlobalNamespaceScope();
        }
    };
};
