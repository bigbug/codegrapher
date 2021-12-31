import getDigraph, { generateDigraph, visit } from ".";
import fs = require('fs');

//const input = 'if(b<0) {\nb=-b;\n}\nb=2+b;\nif(a>1&&a<10&&a==2) {b=10;} else {b=a;} b=b * 2;c=a-b;';
//const input = 'int a = a+2;';
//const input = 'a=2+b;';
//const input = 'if(b==2) {b=10;} else {b=2*b;}';

let input = "";
try {
    input = fs.readFileSync("input.txt", "utf-8");
} catch (err) {
    console.error(err);
    input = "a=b+c;"
}


test("a=2+b;", () => {
    const res = getDigraph("a=2+b;");
    expect(res).toMatchSnapshot();
});

test("a=(b*c)-h;", () => {
    const res = getDigraph("a=(b*c)-h;");
    expect(res).toContain("c");
    expect(res).toMatchSnapshot();
})

test("a=2+(b);", () => {
    const res = getDigraph("a=2+(b);");
    expect(res).toMatchSnapshot();
});

test("if(b==2) {b=10;} else {b=2*b;}", () => {
    const res = getDigraph("if(b==2) {b=10;} else {b=2*b;}");
    expect(res).toMatchSnapshot();
});
test("a=!b;", () => {
    const res = getDigraph("a=!b;");
    expect(res).toMatchSnapshot();
});

test("if(b==2) {a=2;} else {if(b==1) {a=1;} else {a=0;}}", () => {
    const res = getDigraph("if(b==2) {a=2;} else {if(b==1) {a=1;} else {a=0;}}");
    expect(res).toMatchSnapshot();
})

test("b=12;if(a==2) {c=b+34;} else {c=5678;}", () => {
    const res = getDigraph("b=12;if(a==2) {c=b+34;} else {c=5678;}");
    //console.log(res);
    expect(res).toMatchSnapshot();
})

test("Declarations 1", () => {
    const res = visit("int d;");
    expect(res.scopes[0].declarations["d"]).toBeDefined();
    expect(res.scopes[0].declarations["d"].type).toEqual("int");
})

test("Declarations 2", () => {
    const res = visit("int a, b, c=1;int d;string e;static volatile abc f;");
    expect(res.scopes[0].declarations["a"]).toBeDefined();
    expect(res.scopes[0].declarations["b"]).toBeDefined();
    expect(res.scopes[0].declarations["c"]).toBeDefined();
    expect(res.scopes[0].declarations["d"]).toBeDefined();
    expect(res.scopes[0].declarations["e"]).toBeDefined();
    expect(res.scopes[0].declarations["e"].type).toEqual("string");
    expect(res.scopes[0].declarations["f"]).toBeDefined();
    expect(res.scopes[0].declarations["f"].type).toEqual("static volatile abc");
})

test("if pipe with scope", () => {
    const res = visit("int a=2;a = a+1;if(a==2) {int c=1;a=3;if(a==3) {c=2;a=2;}b=a+c;}");
    expect(res.scopes[0].subscopes.length).toEqual(1);
    expect(generateDigraph(res)).toMatchSnapshot();
})

test("function declaraton", () => {
    const res = getDigraph("int max(int num1, int num2) {int result;if (num1 > num2) {result = num1;} else {result = num2;}return result;}", false);
    expect(res).toMatchSnapshot();
})

test("post increment", () => {
    const res = getDigraph("i++;b=i;");
    expect(res).toMatchSnapshot();
})

test("post decrement", () => {
    const res = getDigraph("i--;b=i;");
    expect(res).toMatchSnapshot();
})

test("pre increment", () => {
    const res = getDigraph("++i;b=i;");
    expect(res).toMatchSnapshot();
})

test("pre decrement", () => {
    const res = getDigraph("--i;b=i;");
    expect(res).toMatchSnapshot();
})

test("assignements", () => {
    const res = getDigraph("a+=2;a-=2;a*=2;a/=2;test(a);");
    expect(res).toMatchSnapshot();
})

test("for loop", () => {
    const res = getDigraph("a=2;for(int i=0;i<10;i++){a+=i;}b=a+2;");
    expect(res).toMatchSnapshot();
})

test("arbitrary input", () => {
    const res = getDigraph(input, false);
    try {
        fs.writeFileSync('reverselinktargetresult.dot', res)
        //file written successfully
      } catch (err) {
        console.error(err)
      }
});