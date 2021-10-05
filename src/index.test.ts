import { forEach } from "lodash";
import { toTree } from ".";
import {MyCVisitor} from "./MyCVisitor";

//const input = 'if(b<0) {\nb=-b;\n}\nb=2+b;\nif(a>1&&a<10&&a==2) {b=10;} else {b=a;}';
//const input = 'int a = a+2;';
const input = 'a=b+b;';

test("string tree", () => {
    const v = new MyCVisitor();
    const t = toTree(input);
    console.log(t.toStringTree());
    console.log(t.text);
    const res = v.visit(t);
    console.log(res);
    console.log(v.vars);
    console.log(v.blocks);

    const inputs : {[key: string] : string} = {};
    let a = "digraph {\nnode [shape=box]\ngraph [rankdir=\"LR\"]\n";
    a += v.blocks.map((i, idx)=>{
        const nodeid = i.type + "_" + idx;

        i.inputs.forEach(j=>{
            inputs[j] = nodeid;
        });

        if(i.type === "var") {
            return nodeid + " [label=\""+i.configuration+"\"]"
        } else if (["sum", "multiply"].includes(i.type)) {
            return nodeid + " [label=\""+(i.configuration as string[]).join("\\n")+"\"]"
        } else if (["and", "or"].includes(i.type)) {
            return nodeid + " [label=\""+(i.type==="and" ? "&&" : "||")+"\"]"
        } else {
            throw new Error("Unsupported node of type '"+i.type+"'");
        }
        return nodeid;
    }).join("\n") + "\n";

    let c = 0;
    forEach(v.vars, (key:string, v)=>{
        if(!inputs[key]) {
            inputs[key] = "var_unused_" + c++;
            a += inputs[key] + " [label=\""+v+"\"]\n";
        }
    })

    v.blocks.map((i, idx) => {
        const nodeid = i.type + "_" + idx;

        i.outputs.forEach(j=>{
            const z = inputs[j];
            a+=nodeid+" -> "+z+"\n";
        });
    });

    a+= "\n}";
    console.log(a);
})