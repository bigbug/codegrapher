export type BlockType = "gain"|"sum"|"product"|"function"|"abs"|"var"|"and"|"or"|"relational"|"const"|"switch"|"multiply"|"not"|"multiswitch";

export type Block = {
    type: BlockType,
    inputs: string[],
    outputs: string[],
    configuration: string|string[],
};