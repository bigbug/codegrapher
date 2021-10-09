import getDigraph from ".";
const fs = require('fs');

//const input = 'if(b<0) {\nb=-b;\n}\nb=2+b;\nif(a>1&&a<10&&a==2) {b=10;} else {b=a;} b=b * 2;c=a-b;';
//const input = 'int a = a+2;';
//const input = 'a=2+b;';
//const input = 'if(b==2) {b=10;} else {b=2*b;}';

let input = "";
try {
    input = fs.readFileSync("source.c", "utf-8");
} catch (err) {
    console.error(err);
}


test("a=2+b;", () => {
    const res = getDigraph("a=2+b;");
    expect(res).toMatchSnapshot();
});

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