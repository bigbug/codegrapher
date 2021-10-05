import getDigraph from ".";

//const input = 'if(b<0) {\nb=-b;\n}\nb=2+b;\nif(a>1&&a<10&&a==2) {b=10;} else {b=a;} b=b * 2;c=a-b;';
//const input = 'int a = a+2;';
//const input = 'a=2+b;';
const input = 'if(b==2) {b=10;} else {b=2*b;}';



test("a=2+b;", () => {
    const res = getDigraph("a=2+b;");
    expect(res).toMatchSnapshot();
});

test("if(b==2) {b=10;} else {b=2*b;}", () => {
    const res = getDigraph("if(b==2) {b=10;} else {b=2*b;}");
    expect(res).toMatchSnapshot();
});

test("arbitrary input", () => {
    const res = getDigraph(input);
    console.log(res);
});