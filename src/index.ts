import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { forEach } from 'lodash';
import {CLexer} from "./grammars/c/CLexer";
import {BlockItemListContext, CompilationUnitContext, CParser} from "./grammars/c/CParser";
import { MyCVisitor } from './MyCVisitor';

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

function getKeyByValue(object:any, value:any) {
    return Object.keys(object).find(key => object[key] === value);
  }

export function visit(input: string) {
    const v = new MyCVisitor();
    const t = toTree(input);
    v.visit(t);
    return v;
}

export default function getDigraph(input: string) : string {
    const v = visit(input);

    const outputs : {[key: string] : string} = {};
    let a = "digraph {\nnode [shape=box style=filled]\ngraph [rankdir=\"LR\"]\n";
    a += v.blocks.map((i, idx)=>{
        const nodeid = i.type + "_" + idx;

        i.outputs.forEach(j=>{
            outputs[j] = nodeid;
        });

        if(["var", "const"].includes(i.type)) {
            return nodeid + " [label=\""+i.configuration+"\"]"
        } else if(["function"].includes(i.type)) {
            return nodeid + " [label=\""+i.configuration+"\" color=green]"
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
        } else {
            throw new Error("Unsupported node of type '"+i.type+"'");
        }
        return nodeid;
    }).join("\n") + "\n";

    let c = 0;
    forEach(v.vars, (key:string, v)=>{
        if(!outputs[key]) {
            outputs[key] = "var_unused_" + c++;
            a += outputs[key] + " [label=\""+v+"\"]\n";
        }
    })

    v.blocks.map((i, idx) => {
        const nodeid = i.type + "_" + idx;

        i.inputs.forEach(j=>{
            const label = v.varHistory[j] ? " [label=\""+v.varHistory[j]+"\"]" : "";
            const z = outputs[j];
            a+= z + " -> " + nodeid + label + "\n";
        });

        /*i.outputs.forEach(j => {
            if(Object.values(v.vars).includes(j)) {
                const x = "var_unused_" + c++;
                a += x + " [label=\""+getKeyByValue(v.vars, j)+"\"]\n";
                a += nodeid + " -> " + x + "\n";
            }
        })*/
    });

    a+= "}";
    return a;
}