// jss:
import { RuleList, } from 'jss'; // base technology of our cssfn components
const isLiteralObject = (object) => object && (typeof (object) === 'object') && !Array.isArray(object);
const isStyle = (object) => isLiteralObject(object);
const ruleGenerateId = (rule, sheet) => rule.name ?? rule.key;
class GlobalStyleRule {
    // unrecognized syntax on lower version of javascript
    // // BaseRule:
    // type        : string  = 'style' // for satisfying `jss-plugin-nested`
    // key         : string
    // isProcessed : boolean = false   // required to avoid double processed
    // options     : any
    // renderable? : Object|null|void
    // unrecognized syntax on lower version of javascript
    // // ContainerRule:
    // at          = '@global'
    // rules       : RuleList
    // unrecognized syntax on lower version of javascript
    // // StyleRule:
    // style       : Style
    // selector    : string  = ''      // for satisfying `jss-plugin-nested`
    constructor(key, style, options) {
        // BaseRule:
        this.type = 'style'; // for satisfying `jss-plugin-nested`
        this.key = key;
        this.isProcessed = false; // required to avoid double processed
        this.options = options;
        this.renderable = null;
        // ContainerRule:
        this.at = '@global';
        this.rules = new RuleList({
            ...options,
            parent: this,
        });
        // StyleRule:
        this.style = style; // the `style` needs to be attached to `GlobalStyleRule` for satisfying `onProcessStyle()`
        this.selector = ''; // for satisfying `jss-plugin-nested`
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
    for (const [nestedSelector, nestedStyle] of Object.entries(globalStyle)) {
        if (!isStyle(nestedStyle))
            continue; // invalid value => can't be processed
        // place the nested rule to root:
        sheet.addRule(nestedSelector, nestedStyle, {
            ...options,
            selector: nestedSelector,
        });
    } // for
    // the `@global` operation has been completed => remove unused `@global` prop:
    delete style['@global'];
};
export default function pluginGlobal() {
    return {
        onCreateRule,
        onProcessRule,
    };
}
