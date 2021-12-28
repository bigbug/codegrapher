import getDigraph, { visit } from ".";
const fs = require('fs');

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

test("arbitrary input", () => {
    const res = getDigraph(input);
    //console.log(res);
    try {
        fs.writeFileSync('reverselinktargetresult.dot', res)
        //file written successfully
      } catch (err) {
        console.error(err)
      }
});

test("Declarations", () => {
    const res = visit("int a, b, c=1;int d;");
    expect(res.declarations[0]).toContain("a");
    expect(res.declarations[0]).toContain("b");
    expect(res.declarations[0]).toContain("c");
    expect(res.declarations[0]).toContain("d");
})