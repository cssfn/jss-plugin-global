// jss:
import {
    Plugin,

    Rule,
    RuleList,
    StyleSheet,
}                           from 'jss'           // base technology of our cssfn components
// custom jss-plugins:
import type {
    Style,
}                           from '@cssfn/jss-plugin-extend'



// utilities:
type LiteralObject      = { [key: string]: any }
const isLiteralObject   = (object: any): object is LiteralObject => object && (typeof(object) === 'object') && !Array.isArray(object);

const isStyle           = (object: any): object is Style => isLiteralObject(object);



const ruleGenerateId = (rule: Rule, sheet?: StyleSheet) => (rule as any).name ?? rule.key;

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
    
    
    
    constructor(key: string, style: Style, options: any) {
        // BaseRule:
        (this as any).type        = 'style'; // for satisfying `jss-plugin-nested`
        (this as any).key         = key;
        (this as any).isProcessed = false;   // required to avoid double processed
        (this as any).options     = options;
        (this as any).renderable  = null;
        
        // ContainerRule:
        (this as any).at    = '@global';
        (this as any).rules = new RuleList({
            ...options,
            parent: this,
        });
        
        // StyleRule:
        (this as any).style    = style; // the `style` needs to be attached to `GlobalStyleRule` for satisfying `onProcessStyle()`
        (this as any).selector = '';    // for satisfying `jss-plugin-nested`
        
        const plugins : any = options?.jss?.plugins;
        const onProcessStyle : ((style: Style, rule: Rule, sheet?: StyleSheet) => void) | undefined | null = plugins?.onProcessStyle;
        onProcessStyle?.call(plugins, ((this as any).style as Style), this as unknown as Rule, options?.sheet as (StyleSheet|undefined));
        
        
        
        for (const [propName, propValue] of Object.entries(style)) {
            // exceptions:
            if (propName.includes('&')) continue; // do not process nested rule
            if (propName === 'extend')  continue; // do not process `extend` prop
            if (!isStyle(propValue))    continue; // invalid value => can't be processed
            
            
            
            // because we're in `@global`, all prop names (with some exceptions above) will be recognized as selector expressions
            const selectors = propName;
            ((this as any).rules as RuleList).add(selectors, propValue, {
                ...options,
                generateId : ruleGenerateId,
                
                selector   : selectors,
            });
        } // for
        
        
        
        // let's another plugins take care:
        ((this as any).rules as RuleList).process();
    }
    
    
    
    /**
     * Generates a CSS string.
     */
    toString(options?: any) {
        return ((this as any).rules as RuleList).toString(options);
    }
}



const onCreateRule = (key: string, style: Style, options: any): (Rule|any) => {
    switch (key) {
        case '':
        case '@global':
            return new GlobalStyleRule(key, style, options);
        
        default:
            return null;
    } // switch
};
const onProcessRule = (rule: Rule, sheet?: StyleSheet): void => {
    if (!sheet)                return;
    if (rule.type !== 'style') return;
    
    const style = (rule as any).style as (Style|null|undefined);
    if (!style)                return;
    
    const globalStyle = (style as any)['@global'];
    if (!isStyle(globalStyle)) return;
    
    
    
    const { options } = rule;
    
    
    
    for (const [nestedSelector, nestedStyle] of Object.entries(globalStyle)) {
        if (!isStyle(nestedStyle)) continue; // invalid value => can't be processed
        
        
        
        // place the nested rule to root:
        sheet.addRule(
            nestedSelector,
            nestedStyle,
            {
                ...options,
                selector: nestedSelector,
            }
        );
    } // for
    
    
    
    // the `@global` operation has been completed => remove unused `@global` prop:
    delete (style as any)['@global'];
};

export default function pluginGlobal(): Plugin { return {
    onCreateRule,
    onProcessRule,
}}