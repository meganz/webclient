'use strict';

function traverse(node) {
    while (node) {
        switch (node.type) {
            case 'CallExpression':
                node = node.callee;
                break;
            case 'MemberExpression':
                node = node.object;
                break;
            case 'Identifier':
                return node;
            default:
                return null;
        }
    }
}

function xpath(node, path) {
    path = String(path).split('/');

    var i = 0;
    var l = path.length;

    while (node && l > i) {
        node = node[path[i++]];
    }

    return node || false;
}

// Returns true if the function call node is attached to a jQuery element set.
function isjQuery(node) {
    const id = traverse(node);
    return id && id.name.startsWith('$');
}

module.exports = {
    'hints': {
        meta: {
            docs: {
                description: 'ESLint rule for some miscellaneous stuff.',
                category: 'possible-errors',
                recommended: true
            },
            schema: []
        },
        create(context) {
            return {
                MemberExpression(node) {
                    if (node.parent.type === 'AssignmentExpression') {

                        if (node.object.name === "$" && node.property.name === "dialog") {
                            context.report(node,
                                'Overwriting $.dialog is discouraged, handling of' +
                                ' new dialogs should be achieved through M.safeShowDialog(), see MR!1419');
                        }
                    }
                },
                NewExpression(node) {
                    if (node.callee.name === 'MegaPromise' && !node.arguments.length) {
                        context.report(node,
                            'New code should use the native Promise implementation instead of MegaPromise, ' +
                            'or provide an executor to the MegaPromise constructor. ' +
                            'The promisify() helper function is worth looking into as well.');
                    }
                },
                Identifier(node) {
                    // Enforce the use of toArray.apply(null, arguments)
                    if (node.name === "arguments" && xpath(node, 'parent/callee/property/name') !== 'apply') {
                        context.report(node, 'The `arguments` object must not be passed or leaked anywhere.');
                    }
                },
                TryStatement(node) {
                    context.report(node,
                        'The use of try/catch statements can impact performance, they must be isolated ' +
                        'to a minimal function so that the main code is not affected. ' +
                        'I.e. consider using our tryCatch() helper.');
                }
            };
        }
    },
    'misc-warnings': {
        meta: {
            docs: {
                description: 'ESLint rule for some miscellaneous stuff.',
                category: 'enhancements',
                recommended: true
            },
            schema: []
        },
        create(context) {
            return {
                MemberExpression(node) {
                    const obj = node.object.name;
                    const prop = node.property.name;

                    if (prop === 'forEach') {
                        context.report(node, 'Prefer for() loops instead of Array.forEach');
                    }
                    else if (obj === 'Promise' && prop === 'all') {
                        context.report(node, 'Make sure you are not mixing Promise and MegaPromise instances, ' +
                            'they are not compatible with each other and may result in unexpected behaviours.');
                    }
                    else if (obj === 'localStorage' && !/^test|[Dd]ebug/.test(prop)) {
                        context.report(node, 'Do not abuse localStorage, ' +
                            'consider using sessionStorage or M.setPersistentData() instead.');
                    }
                }
            };
        }
    },
    'jquery-replacements': {
        meta: {
            docs: {
                description: 'ESLint rule to disallow and/or replace jQuery methods',
                category: 'possible-errors',
                recommended: true
            },
            schema: []
        },
        create(context) {
            return {
                CallExpression(node) {
                    if (node.callee.type === 'MemberExpression') {
                        const methods = ['html', 'append', 'prepend'];
                        const prop = node.callee.property.name;

                        if (methods.includes(prop) && isjQuery(node)) {
                            let alt = 'safe' + (prop === 'html' ? 'HTML' : (prop[0].toUpperCase() + prop.substr(1)));
                            let msg = `Please do use ${alt} instead of jQuery.${prop}`;

                            if (prop === 'html' && !node.arguments.length) {
                                msg = 'jQuery.html() is a discouraged method to deal with the DOM...';
                            }

                            context.report(node, msg);
                        }
                        else if (prop === 'on' && isjQuery(node)) {
                            context.report(node, 'Prefer $.rebind to $.on and $.off + $.on');
                        }
                        else if ((prop === 'show' || prop === 'hide') && isjQuery(node)) {
                            let rep = prop === 'show' ? 'removeClass' : 'addClass';

                            context.report(node, `jQuery.${prop}() should be replaced with jQuery.${rep}('hidden')`);
                        }
                    }
                }
            };
        }
    },
    'jquery-scopes': {
        meta: {
            docs: {
                description: 'ESLint rule to suggest enhancements to jQuery namespaces/scopes',
                category: 'possible-enhancements',
                recommended: false
            },
            schema: []
        },
        create(context) {
            return {
                CallExpression(node) {
                    const arg0 = node.arguments[0];

                    if (node.callee.type === 'MemberExpression') {
                        const methods = ['unbind', 'rebind', 'off', 'on'];
                        const prop = node.callee.property.name;

                        if (methods.includes(prop) && isjQuery(node)
                            && arg0 && arg0.type === "Literal" && arg0.value && arg0.value.indexOf(".") === -1) {

                            context.report(node,
                                'Found "' + prop + '" call, but the event name was not containing a ' +
                                'namespace, which may cause accidental removal of other event handlers. ' +
                                'Please add namespace to ' + node.arguments[0].raw);
                        }
                    }
                    else if (isjQuery(node) && node.arguments.length === 1 && arg0.type === "Literal") {
                        context.report(node, 'Found unscoped/global DOM query: $(' + node.arguments[0].raw + ')');
                    }
                }
            };
        }
    },
};
