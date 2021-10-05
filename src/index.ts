import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import {CLexer} from "./grammars/c/CLexer";
import {BlockItemListContext, CompilationUnitContext, CParser} from "./grammars/c/CParser";

export function toTree(input: string) : BlockItemListContext {
    // Create the lexer and parser
    const inputStream = new ANTLRInputStream(input);
    const lexer = new CLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new CParser(tokenStream);

    // Parse the input, where `compilationUnit` is whatever entry point you defined
    const tree:BlockItemListContext = parser.blockItemList();
    return tree;
}