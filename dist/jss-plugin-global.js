"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// jss:
const jss_1 = require("jss"); // base technology of our cssfn components
const isLiteralObject = (object) => object && (typeof (object) === 'object') && !Array.isArray(object);
const isStyle = (object) => isLiteralObject(object);
const combineSelector = (parent, children) => {
    if (!parent)
        return children;
    return (children.split(/\s*,\s*/g)
        .map((child) => `${parent} ${child.trim()}`)
        .join(','));
};
const ruleGenerateId = (rule, sheet) => rule.name ?? rule.key;
class GlobalStyleRule {
    // BaseRule:
    type = 'style'; // for satisfying `jss-plugin-nested`
    key;
    isProcessed = false; // required to avoid double processed
    options;
    renderable;
    // ContainerRule:
    at = '@global';
    rules;
    // StyleRule:
    style;
    selector = ''; // for satisfying `jss-plugin-nested`
    constructor(key, style, options) {
        this.key = key;
        this.options = options;
        this.rules = new jss_1.RuleList({
            ...options,
            parent: this,
        });
        this.style = style; // the `style` needs to be attached to `GlobalStyleRule` for satisfying `onProcessStyle()`
        const plugins = options?.jss?.plugins;
        const onProcessStyle = plugins?.onProcessStyle;
        onProcessStyle?.call(plugins, this.style, this, options?.sheet);
        for (const [propName, propValue] of Object.entries(style)) {
            // exceptions:
            if (propName.includes('&'))
                continue; // do not process nested rule
            if (propName === 'extend')
                continue; // do not process `extend` prop
            if (!isStyle(propValue))
                continue; // invalid value => can't be processed
            // because we're in `@global`, all prop names (with some exceptions above) will be recognized as selector expressions
            const selectors = propName;
            this.rules.add(selectors, propValue, {
                ...options,
                generateId: ruleGenerateId,
                selector: selectors,
            });
        } // for
        // let's another plugins take care:
        this.rules.process();
    }
    /**
     * Generates a CSS string.
     */
    toString(options) {
        return this.rules.toString(options);
    }
}
const onCreateRule = (key, style, options) => {
    switch (key) {
        case '':
        case '@global':
            return new GlobalStyleRule(key, style, options);
        default:
            return null;
    } // switch
};
const onProcessRule = (rule, sheet) => {
    if (!sheet)
        return;
    if (rule.type !== 'style')
        return;
    const style = rule.style;
    if (!style)
        return;
    const globalStyle = style['@global'];
    if (!isStyle(globalStyle))
        return;
    const { options } = rule;
    for (const [propName, propValue] of Object.entries(globalStyle)) {
        if (!isStyle(propValue))
            continue; // invalid value => can't be processed
        sheet.addRule(propName, propValue, {
            ...options,
            selector: combineSelector(rule.selector ?? '', propName),
        });
    } // for
    // the `@global` operation has been completed => remove unused `@global` prop:
    delete style['@global'];
};
function pluginGlobal() {
    return {
        onCreateRule,
        onProcessRule,
    };
}
exports.default = pluginGlobal;
