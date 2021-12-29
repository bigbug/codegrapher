export type BlockType = "shift"|"gain"|"sum"|"product"|"function"|"abs"|"var"|"and"|"or"|"relational"|"const"|"switch"|"multiply"|"not"|"multiswitch"|"if";

export type ScopeType = "main"|"if"|"function";

export type Declaration = {
    type: string,
}

export type Block = {
    type: BlockType,
    inputs: string[],
    outputs: string[],
    configuration: string|string[],
    id: string,
};

export type Scope = {
    declarations: {[variable: string]: Declaration},
    variables: {[variable: string]: string},
    blocks: Block[],
    type: ScopeType,
    name: string,
    subscopes: Scope[],
}