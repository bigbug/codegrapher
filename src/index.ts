import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { ParseTree } from 'antlr4ts/tree/ParseTree';
import {CLexer} from "./grammars/c/CLexer";
import {BlockItemListContext, CompilationUnitContext, CParser} from "./grammars/c/CParser";
import { MyCVisitor } from './MyCVisitor';
import { Block, Scope } from './types';

export function toTree(input: string, parts = true) : ParseTree {
    // Create the lexer and parser
    const inputStream = CharStreams.fromString(input);
    const lexer = new CLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new CParser(tokenStream);

    // Parse the input, where `compilationUnit` is whatever entry point you defined
    if(!parts) {
        const tree:CompilationUnitContext = parser.compilationUnit();
        return tree;
    } else {
        const tree:BlockItemListContext = parser.blockItemList();
        return tree;
    }
}

export function visit(input: string, parts = true) : MyCVisitor {
    const v = new MyCVisitor();
    const t = toTree(input, parts);
    v.visit(t);
    return v;
}

export function generateScope(scope: Scope) : string {

    let a = "";
    let arrows = "";

    if(scope.name!=="") {
        a += "label=\""+scope.name+"\"\n";
    }

    a += scope.blocks.map(i => {
        const nodeid = "node_" + i.id;

        i.inputs.forEach(j=>{
            const label = /*v.varHistory[j] ? " [label=\""+v.varHistory[j]+"\"]" : */"";
            const z = "node_" + j;
            arrows += z + " -> " + nodeid + label + "\n";
        });

        if(["var", "const"].includes(i.type)) {
            return nodeid + " [label=\""+i.configuration+"\"]"
        } else if(["param"].includes(i.type)) {
            return nodeid + " [label=\""+i.configuration+"\" color=orange]"
        } else if(["return"].includes(i.type)) {
            return nodeid + " [label=\"return\" color=orange]"
        } else if(["function"].includes(i.type)) {
            return nodeid + " [label=\""+i.configuration+"\" color=green]"
        } else if(["activation"].includes(i.type)) {
            return nodeid + " [label=\"act\" color=green]"
        } else if (["sum", "multiply", "shift"].includes(i.type)) {
            return nodeid + " [label=\""+(i.configuration as string[]).join("\\n")+"\"]"
        } else if (["relational"].includes(i.type)) {
            return nodeid + " [label=\""+(i.configuration as string)+"\"]"
        } else if (["and", "or"].includes(i.type)) {
            return nodeid + " [label=\""+(i.type==="and" ? "&&" : "||")+"\"]"
        } else if (["abs", "not"].includes(i.type)) {
            return nodeid + " [label=\""+i.type+"\"]"
        } else if (["gain"].includes(i.type)) {
            return nodeid + " [label=\""+i.configuration+"\"]"
        } else if (["switch"].includes(i.type)) {
            return nodeid + " [label=\"1\\ncond\\n2\"]"
        } else if (["multiswitch"].includes(i.type)) {
            return nodeid + " [label=\"cond\\n"+i.configuration+"\"]"
        } else if (["ifmultiplex"].includes(i.type)) {
            return nodeid + " [label=\"pipe\"]"
        } else {
            throw new Error("Unsupported node of type '"+i.type+"'");
        }
    }).join("\n") + "\n";

    a += scope.subscopes.map(i=> {
        return "subgraph cluster_"+i.id+" {"+
            generateScope(i)
        +"}";
    })

    a += arrows;

    return a;
}

export function generateDigraph(v: MyCVisitor) : string {
    let a = "digraph {\nnode [shape=box style=filled]\ngraph [rankdir=\"LR\"]\n";
    a += generateScope(v.scopes[0]);
    a+= "}";
    return a;
}

export default function getDigraph(input: string, parts = true) : string {
    const v = visit(input, parts);
    return generateDigraph(v);    
}