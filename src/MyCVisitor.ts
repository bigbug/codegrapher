import { ParserRuleContext } from 'antlr4ts';
import { AbstractParseTreeVisitor } from 'antlr4ts/tree/AbstractParseTreeVisitor'
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import { get, isString } from 'lodash';
import { CLexer } from './grammars/c/CLexer';
import { ArgumentExpressionListContext, AssignmentExpressionContext, UnaryOperatorContext, EqualityExpressionContext, AdditiveExpressionContext, LogicalAndExpressionContext, PostfixExpressionContext, RelationalExpressionContext, SelectionStatementContext, StatementContext, PrimaryExpressionContext, LogicalOrExpressionContext, MultiplicativeExpressionContext, UnaryExpressionContext, CompoundStatementContext, BlockItemListContext, BlockItemContext, IterationStatementContext, ShiftExpressionContext, DirectDeclaratorContext, TypedefNameContext, DeclarationSpecifiersContext, InitDeclaratorContext, FunctionDefinitionContext, TypeSpecifierContext, JumpStatementContext  } from './grammars/c/CParser';
import {CVisitor} from './grammars/c/CVisitor'
import { Block, BlockType, Scope, ScopeType, VisitorState } from './types';
//import { v4 as uuidv4 } from 'uuid';
import { ParseTree } from 'antlr4ts/tree/ParseTree';
import { RuleNode } from 'antlr4ts/tree/RuleNode';


// Extend the AbstractParseTreeVisitor to get default visitor behaviour
export class MyCVisitor extends AbstractParseTreeVisitor<string> implements CVisitor<string> {
  public scopes: Scope[] = [];
  private currentDeclarationType = "";
  private visitorState : VisitorState = "normal";

  private idCounter = 1;

  constructor() {
    super();
    this.pushScope("", "main");
  }

  defaultResult() : string {
    return "";
  }

  id(): string {
    return "n"+ (this.idCounter++);
  }

  private pushScope(name: string, type: ScopeType) {
    this.scopes.push({
      id: this.id(),
      blocks: [],
      declarations: {},
      name: name,
      type: type,
      subscopes: [],
      variables: {},
      varHistory: {}
    });
  }

  private useVariable(v: string) : string {
    for(let i = this.scopes.length-1; i>=0; i--) {
      if(this.scopes[i].variables[v]) {
        if(i===0 && this.scopes.length>1 && !this.scopes[0].variables[v].target) {
          const currentOutput = this.id();

          this.scopes[i].variables[v].target = {
            type: "var",
            inputs: [this.scopes[i].variables[v].currentOutput],
            outputs: [currentOutput],
            configuration: v,
            id: currentOutput,
          };
          this.scopes[i].blocks.push(this.scopes[0].variables[v].target as Block);
          this.scopes[i].variables[v].currentOutput = currentOutput;
        }
        return this.scopes[i].variables[v].currentOutput;
      }
    }

    const currentOutput = this.id();

    this.scopes[0].variables[v] = {
      currentOutput,
      target: {
        type: "var",
        inputs: [],
        outputs: [currentOutput],
        configuration: v,
        id: currentOutput,
      }
    };
    this.scopes[0].blocks.push(this.scopes[0].variables[v].target as Block);
    return currentOutput;
  }

  private setVariable(v: string, newValue:string) : void {
    if(!this.scopes[this.scopes.length-1].variables[v]) {
      this.scopes[this.scopes.length-1].variables[v] = {
        currentOutput: newValue
      }
    }
    this.scopes[this.scopes.length-1].variables[v].currentOutput = newValue;
    this.scopes[this.scopes.length-1].varHistory[newValue] = v;
  }

  private useConstant(v: string) : string {
    const id = this.id();
    this.addBlock("const", [], [id], v);
    return id;
  }

  private useIteration(v: string) : string {
    const id = this.id();
    this.addBlock("iterationVariable", [], [id], v);
    return id;
  }

  private addBlock(type: BlockType, inputs: string[] = [], outputs: string[] = [], configuration: string|string[] = []) : string {

    const block : Block = {
      type,
      inputs,
      outputs,
      configuration,
      id: outputs.length>=1 ? outputs[0] : this.id(),
    };
    this.scopes[this.scopes.length-1].blocks.push(block);
    return block.id;
  }

  private popScope() : Scope {
    const scope:Scope = this.scopes.pop() as Scope;
    this.scopes[this.scopes.length-1].subscopes.push(scope);
    return scope;
  }

  visitAssignmentExpression(context: AssignmentExpressionContext) : string {
    const leftVar = get(context, "children[0].text");
    if(context.children
      && context.children.length>1
    ) {
      const operator = get(context, "children[1].text");
      const expression = this.visit(get(context, "children[2]"));
      if(operator == "=") {
        this.setVariable(leftVar, expression);
        return "";
      } else if(["+=", "-=", "*=", "/="].includes(operator)) {
        const dict:{[variable:string]:string[]} = {"+=": ["+","+"], "-=": ["+", "-"], "*=": ["*","*"], "/=": ["*", "/"]}
        const operators : string[] = dict[operator];
        const parts = [this.useVariable(leftVar), expression];
        const output = this.id();
        this.setVariable(leftVar, output);
        this.addBlock("sum", parts, [output], operators);
        return output;
      } else {
        throw new Error("Operator '"+operator+"' is not supported yet!");
      }
    }
    return this.visitChildren(context);
  }

  visitAdditiveExpression(context: AdditiveExpressionContext) : string {
    if(context.children
      && context.children.length>=3
    ) {
      //console.log(context.children);
      const operators = context.children.filter((i,idx)=>idx%2===1).map(i=>i.text);
      operators.splice(0,0,"+");
      const parts : string[] = context.children.filter((i,idx)=>idx%2===0).map(i=>this.visit(i));
      //console.log(context.children.filter((i,idx)=>idx%2===0));
      //console.log(context.children.filter((i,idx)=>idx%2===0).map(i=>this.visit(i)));
      const output = this.id();
      this.addBlock("sum", parts, [output], operators);
      return output;
    }
    return this.visitChildren(context);
  }

  visitMultiplicativeExpression(context: MultiplicativeExpressionContext) : string {
    if(context.children
      && context.children.length>=3
    ) {
      const operators = context.children.filter((i,idx)=>idx%2===1).map(i=>i.text);
      operators.splice(0,0,"*");
      const parts : string[] = context.children.filter((i,idx)=>idx%2===0).map(i=>this.visit(i));
      const output = this.id();
      this.addBlock("multiply", parts, [output], operators);
      return output;
    }
    return this.visitChildren(context);
  }

  visitLogicalAndExpression(context: LogicalAndExpressionContext) : string {
    if(context.children
      && context.children.length>=3
    ) {
      const parts : string[] = context.children.filter((i,idx)=>idx%2===0).map(i=>this.visit(i));
      const output = this.id();
      this.addBlock("and", parts, [output]);
      return output;
    }
    return this.visitChildren(context);
  }

  visitLogicalOrExpression(context: LogicalOrExpressionContext) : string {
    if(context.children
      && context.children.length>=3
    ) {
      const parts : string[] = context.children.filter((i,idx)=>idx%2===0).map(i=>this.visit(i)).filter((i)=>isString(i));
      const output = this.id();
      this.addBlock("or", parts, [output]);
      return output;
    }
    return this.visitChildren(context);
  }

  visitRelationalExpression(context: RelationalExpressionContext) : string {
    if(context
      && context.children
      && context.children.length===3) {
        const operator = context.children[1].text;
        const left = context.children[0];
        const right = context.children[2];
        
        const output = this.id();
        this.addBlock("relational", [this.visit(left), this.visit(right)], [output], operator);
        return output;
    }
    return this.visitChildren(context);
  }

  visitEqualityExpression(context: EqualityExpressionContext) : string {
    if(context
      && context.children
      && context.children.length===3) {
        const operator = context.children[1].text;
        const left = context.children[0];
        const right = context.children[2];
        
        const output = this.id();
        this.addBlock("relational", [this.visit(left), this.visit(right)], [output], operator);
        return output;
    }
    return this.visitChildren(context);
  }

  visitPostfixExpression(context: PostfixExpressionContext) : string {
    // Function
    if(context.children
      && context.children.length===4
      && context.children[1].text === "("
      && context.children[2] instanceof ArgumentExpressionListContext
      && context.children[3].text === ")"
    ) {
      const functionName = get(context, "children[0].text");
      const args : ParserRuleContext[] = get(context, "children[2].children",[]).filter((i:ParserRuleContext)=>!(i instanceof TerminalNode));
      const argResults = args.map(i=>this.visit(i));

      const out = this.id();
      this.addBlock("function", argResults, [out], functionName);
      return out;
    }
    
    // Variable
    if(context.children
      && context.children.length>=1
      && context.children[0]
      && context.children[0] instanceof PrimaryExpressionContext
      && context.children[0].children
      && context.children[0].children.length === 1
      && context.children[0].children[0] instanceof TerminalNode
      && context.children[0].children[0]._symbol.type === CLexer.Identifier
    ) {
      if(context.children[1] instanceof TerminalNode
        && context.children[1]._symbol.type === CLexer.PlusPlus) {
          const varName = context.children[0].text;
          const id = this.useVariable(varName);

          const output = this.id();
          const constant = this.useConstant("1");
          this.addBlock("sum", [id, constant], [output], ["+", "+"]);
          this.setVariable(varName, output);

          return id;
        }
      else if(context.children[1] instanceof TerminalNode
        && context.children[1]._symbol.type === CLexer.MinusMinus) {
          const varName = context.children[0].text;
          const id = this.useVariable(varName);

          const output = this.id();
          const constant = this.useConstant("1");
          this.addBlock("sum", [id, constant], [output], ["+", "-"]);
          this.setVariable(varName, output);

          return id;
        }
      return this.useVariable(context.text);
    }

    // Constant
    if(context.children
      && context.children.length===1
      && context.children[0]
      && context.children[0] instanceof PrimaryExpressionContext
      && context.children[0].children
      && context.children[0].children.length === 1
      && context.children[0].children[0] instanceof TerminalNode
      && context.children[0].children[0]._symbol.type === CLexer.Constant
    ) {
      return this.useConstant(context.text);
    }

    //throw new Error("unresolved postfix: " + context.text);
    return this.visitChildren(context);
  }

  visitMultiSwitch(conditionVariable: string, assignmentVar: string, context: SelectionStatementContext) : {
    condition: string,
    value: ParseTree,
  }[]|false {

    let res : {
      condition: string,
      value: ParseTree,
    }[] = [];
    
    const conditionVar = get(context, "children[2].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].text");
    
    // single expression: assignment Var if
    const assignmentVarIf = get(context, "children[4].children[0].children[1].children[0].children[0].children[0].children[0].children[0].children[0].children[0].text");
    const ifStatementChildren = get(context, "children[4].children[0].children[1].children[0].children");
    const ifStatementsOne = ifStatementChildren?.length===1 && ifStatementChildren[0] instanceof StatementContext;

    // single expression: assignment Var else
    const assignmentVarElse = get(context, "children[6].children[0].children[1].children[0].children[0].children[0].children[0].children[0].children[0].children[0].text");
    const elseStatementChildren = get(context, "children[6].children[0].children[1].children[0].children");
    const elseStatementsOne = elseStatementChildren?.length===1 && elseStatementChildren[0] instanceof StatementContext;


    if(!assignmentVarIf || assignmentVarIf!==assignmentVar) {
      return false;
    }
    
    if(!conditionVar || conditionVar!==conditionVariable) {
      return false;
    }

    if(assignmentVarIf
      && ifStatementsOne
    ) {
      const ifExpr = ifStatementChildren[0].children[0].children[0].children[0].children[2];
      const conditionVar = get(context, "children[2].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[2].text");
      res = [...res, {
        condition: conditionVar,
        value: ifExpr
      }];
    }

    if(assignmentVarIf
      && assignmentVarIf === assignmentVarElse
      && ifStatementsOne
      && elseStatementsOne
    ) {
      const elseExpr = elseStatementChildren[0].children[0].children[0].children[0].children[2];
      res = [...res, {
        condition: "*",
        value: elseExpr
      }];
      return res;
    } else  // Another if in else statement:
    if(context.children
      && context.children.length>6
      && context.children[6] instanceof StatementContext
      && context.children[6].children
      && context.children[6].children.length===1
      && context.children[6].children[0]
      && context.children[6].children[0] instanceof CompoundStatementContext
      && context.children[6].children[0].children
      && context.children[6].children[0].children.length===3
      && context.children[6].children[0].children[0] instanceof TerminalNode
      && context.children[6].children[0].children[1] instanceof BlockItemListContext
      && context.children[6].children[0].children[2] instanceof TerminalNode
      && context.children[6].children[0].children[1].children
      && context.children[6].children[0].children[1].children.length===1
      && context.children[6].children[0].children[1].children[0] instanceof BlockItemContext
      && context.children[6].children[0].children[1].children[0].children
      && context.children[6].children[0].children[1].children[0].children.length===1
      && context.children[6].children[0].children[1].children[0].children[0] instanceof StatementContext
      && context.children[6].children[0].children[1].children[0].children[0].children
      && context.children[6].children[0].children[1].children[0].children[0].children.length===1
      && context.children[6].children[0].children[1].children[0].children[0].children[0] instanceof SelectionStatementContext
    ) {
      const sub = this.visitMultiSwitch(conditionVariable, assignmentVarIf, context.children[6].children[0].children[1].children[0].children[0].children[0]);
      if(sub) {
        res = [...res, ...sub];
        return res;
      }
    }

    return false;
  }

  visitSelectionStatement(context: SelectionStatementContext) : string {
    const t = context.text;

    const condition = get(context, "children[2]");

    // single expression: left var:
    const leftVar = get(context, "children[2].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].text");
    if(`if(${leftVar}<0){${leftVar}=-${leftVar};}`===t) {
      //console.log("abs");
      //console.log(leftVar);
      const newValue = this.id();
      const oldValue = this.useVariable(leftVar);
      this.setVariable(leftVar, newValue);
      this.addBlock("abs", [oldValue], [newValue]);
      return "";
    }

    // B
    let blockItemList : BlockItemListContext | undefined;
    if(context
      && context.children
      && context.children.length >= 4
      && context.children[4] instanceof StatementContext
      && context.children[4].children
      && context.children[4].children.length === 1
      && context.children[4].children[0] instanceof CompoundStatementContext
      && context.children[4].children[0].children
      && context.children[4].children[0].children.length === 3
      && context.children[4].children[0].children[1] instanceof BlockItemListContext
    ) {
      blockItemList = context.children[4].children[0].children[1];
    }

    // single expression: assignment Var if
    const assignmentVarIf = get(context, "children[4].children[0].children[1].children[0].children[0].children[0].children[0].children[0].children[0].children[0].text");
    const ifStatementChildren = get(context, "children[4].children[0].children[1].children[0].children");
    const ifStatementsOne = ifStatementChildren?.length===1 && ifStatementChildren[0] instanceof StatementContext;

    // single expression: assignment Var else
    const assignmentVarElse = get(context, "children[6].children[0].children[1].children[0].children[0].children[0].children[0].children[0].children[0].children[0].text");
    const elseStatementChildren = get(context, "children[6].children[0].children[1].children[0].children");
    const elseStatementsOne = elseStatementChildren?.length===1 && elseStatementChildren[0] instanceof StatementContext;

    if(assignmentVarIf
      && assignmentVarIf === assignmentVarElse
      && ifStatementsOne
      && elseStatementsOne
      && blockItemList?.childCount === 1
    ) {
      const ifExpr = ifStatementChildren[0].children[0].children[0].children[0].children[2];
      const elseExpr = elseStatementChildren[0].children[0].children[0].children[0].children[2];
      const out = this.id();
      const params = [this.visit(ifExpr), this.visit(condition), this.visit(elseExpr)];
      this.setVariable(assignmentVarIf, out);
      this.addBlock("switch", params, [out]);
      return out;
    }


    if(assignmentVarIf
      && ifStatementsOne
      && blockItemList?.childCount === 1
    ) {
      const ifExpr = ifStatementChildren[0].children[0].children[0].children[0].children[2];
      const out = this.id();
      const params = [this.visit(ifExpr), this.visit(condition), this.useVariable(assignmentVarIf)];
      this.setVariable(assignmentVarIf, out);
      this.addBlock("switch", params, [out]);
      return out;
    }

    /*if(assignmentVarIf) {
      const ms = this.visitMultiSwitch(leftVar, assignmentVarIf, context);
      
      if(ms) {
        const out = this.id();
        const params = [this.useVariable(leftVar), ...ms.map(i=>this.visit(i.value))];
        this.setVariable(assignmentVarIf, out);
        this.addBlock("multiswitch", params, [out], ms.map(i=>i.condition).join("\n"));
        return out;
      }
    }*/

    if(blockItemList) {
      const cond = this.visit(condition);
      this.visitBlockItemList(blockItemList, "if");
      const subscope : Scope = this.scopes[this.scopes.length-1].subscopes[this.scopes[this.scopes.length-1].subscopes.length-1];
      const activationId = this.id();
      subscope.blocks.push({
        type: "activation",
        configuration: [],
        inputs: [cond],
        outputs: [],
        id: activationId,
      });
      const multiplexVars = Object.keys(subscope.variables).filter(variable => !subscope.declarations[variable]);
      multiplexVars.forEach(variable => {
        const output = this.id();
        this.addBlock("ifmultiplex", [activationId, this.useVariable(variable), subscope.variables[variable].currentOutput], [output]);
        this.setVariable(variable, output);
      });
      return "";
    }

    console.log("unresolved if");
    return "";
  }

  visitShiftExpression(context: ShiftExpressionContext) : string {
    if(context.children
      && context.children.length>=3
    ) {
      const operators = context.children.filter((i,idx)=>idx%2===1).map(i=>i.text);
      const parts : string[] = context.children.filter((i,idx)=>idx%2===0).map(i=>this.visit(i)).filter((i)=>isString(i));
      const output = this.id();
      this.addBlock("shift", parts, [output], operators);
      return output;
    }
    return this.visitChildren(context);
  }

  visitUnaryExpression(context: UnaryExpressionContext) : string {
    if(context.children
      && context.children.length===2
      && context.children[0] instanceof UnaryOperatorContext
      && context.children[0].children
      && context.children[0].children.length===1
      && context.children[0].children[0] instanceof TerminalNode
      && context.children[0].children[0]._symbol.type === CLexer.Not
    ) {
      const out = this.id();
      const params = [this.visit(context.children[1])];
      this.addBlock("not", params, [out]);
      return out;
    }
    if(context.children
      && context.children.length===2
      && context.children[0] instanceof UnaryOperatorContext
      && context.children[0].children
      && context.children[0].children.length===1
      && context.children[0].children[0] instanceof TerminalNode
      && context.children[0].children[0]._symbol.type === CLexer.Minus
    ) {
      const out = this.id();
      const params = [this.visit(context.children[1])];
      this.addBlock("gain", params, [out], "-1");
      return out;
    }

    if(context.children
      && context.children.length===2
      && context.children[0] instanceof TerminalNode
      && [CLexer.PlusPlus, CLexer.MinusMinus].includes(context.children[0]._symbol.type)
      && context.children[1] instanceof PostfixExpressionContext) {
        const varName = context.children[1].text;
        const id = this.useVariable(varName);

        const output = this.id();
        const constant = this.useConstant("1");
        if(context.children[0]._symbol.type === CLexer.PlusPlus) {
          this.addBlock("sum", [id, constant], [output], ["+", "+"]);
        } else if(context.children[0]._symbol.type === CLexer.MinusMinus) {
          this.addBlock("sum", [id, constant], [output], ["+", "-"]);
        }
        this.setVariable(varName, output);

        return output;
      }

    return this.visitChildren(context);
  }

  visitUnaryOperator(context: UnaryOperatorContext) : string {
    return this.visitChildren(context);
  }



  visitPrimaryExpression(context: PrimaryExpressionContext) : string {
    // Do not return terminal nodes!
    if(context.children
      && context.children.length===3
      && context.children[0] instanceof TerminalNode
      && context.children[2] instanceof TerminalNode
      && context.children[0]._symbol.type === CLexer.LeftParen
      && context.children[2]._symbol.type === CLexer.RightParen
      ) {
      return this.visit(context.children[1]);
    }
    return this.visitChildren(context);
  }

  private visitDecl(context: RuleNode) : string {
    this.scopes[this.scopes.length-1].declarations[context.text] = {type: this.currentDeclarationType, parameter: this.visitorState=="function"};
    if(this.visitorState=="function") {
      const id = this.id();
      this.addBlock("param", [], [id], context.text);
      this.setVariable(context.text, id);
    }
    return this.visitChildren(context);
  }

  visitTypedefName(context: TypedefNameContext) : string {
    return this.visitDecl(context);
  }
  visitDirectDeclarator(context: DirectDeclaratorContext) : string {
    if(context.children
      && context.children.length>=3
      && context.children.length<=4
      && this.visitorState==="function"
      && context.children[1].text==="("
      && context.children[context.children.length-1].text===")") {
        this.scopes[this.scopes.length-1].name += (context.children.splice(0,1) as ParseTree[])[0].text;
      }


    if(context.children
      && context.children.length===1
      && context.children[0] instanceof TerminalNode)
      return this.visitDecl(context);
    return this.visitChildren(context);
  }

  visitDeclarationSpecifiers (context: DeclarationSpecifiersContext) : string {
    const typeOfDeclaration = context.children?.splice(0, context.children.length-1);
    this.currentDeclarationType = typeOfDeclaration?.map(i=>i.text).join(" ") || "";
    return this.visitChildren(context);
  }

  visitTypeSpecifier(ctx: TypeSpecifierContext) : string{
    if(ctx.children
      && ctx.children.length===1
      && ctx.children[0] instanceof TerminalNode) {
        this.currentDeclarationType = ctx.text;
        return "";
      }
    return this.visitChildren(ctx);
  }

  visitBlockItemList(ctx: BlockItemListContext, type : ScopeType = "main") : string {
    if(this.visitorState==="function" || (type==="main" && this.scopes[this.scopes.length-1].type==="main") || this.visitorState==="for") {
      this.visitorState = "normal";
      return this.visitChildren(ctx);
    }
    this.pushScope("", type);
    this.visitChildren(ctx);

    if(this.scopes.length>1) {
      this.popScope();
    }
    return "";
  }

  visitInitDeclarator(ctx: InitDeclaratorContext) : string {
    if(ctx.children?.length===3) {
      this.visit(ctx.children[0]);
      this.setVariable(ctx.children[0].text, this.visit(ctx.children[2]));
      return "";
    }
    return this.visitChildren(ctx);
  }

  visitFunctionDefinition(ctx: FunctionDefinitionContext) : string {
    this.visitorState = "function";
    const type : ParseTree[] = ctx.children?.splice(0,1) as ParseTree[];
    this.pushScope("("+type[0].text+")", "function");
    this.visitChildren(ctx);

    const functionScope = this.popScope();

    const multiplexVars = Object.keys(functionScope.variables).filter(variable => !functionScope.declarations[variable]);

    multiplexVars.forEach(variable => {
      if(this.scopes[this.scopes.length-1].variables[variable] && this.scopes[this.scopes.length-1].variables[variable].target) {
        this.scopes[this.scopes.length-1].variables[variable].target?.inputs.push(functionScope.variables[variable].currentOutput);
      }
    })

    const returns = functionScope.dataStorage?.returns;
    if(returns && returns.length>=1) {
      functionScope.blocks.push({
        configuration: [],
        type: "return",
        id: this.id(),
        inputs: returns,
        outputs: [],
      })
    }

    return "";
  }

  visitIterationStatement(context: IterationStatementContext) : string {
    if(context.children
      && context.children.length > 3
      && context.children[0].text === "for") {
      //console.log("for");
      this.visitorState = "for";
      this.pushScope("for", "for");
      
      this.visit(context.children[2]);
      this.scopes[this.scopes.length-1].name = "for("+context.children[2].text + ")";

      const forVars = this.scopes[this.scopes.length-1].variables;
      //const forBlocks = this.scopes[this.scopes.length-1].blocks;

      this.scopes[this.scopes.length-1].blocks = [];
      Object.keys(forVars).forEach(variable => {
        //const id = this.useConstant(variable);
        const id = this.useIteration(variable);
        this.setVariable(variable, id);
      });
      
      this.visit(context.children[4]);
      
      const functionScope = this.popScope();

      const multiplexVars = Object.keys(functionScope.variables).filter(variable => !functionScope.declarations[variable]);
      multiplexVars.forEach(variable => {
        const output = this.id();
        this.addBlock("formultiplex", [this.useVariable(variable), functionScope.variables[variable].currentOutput], [output]);
        this.setVariable(variable, output);
      });

      return "";
    }
    console.log("Iterations are not evaluated!:" + context.text);
    return "";
  }

  visitJumpStatement(ctx: JumpStatementContext) : string {
    if(ctx.children
      && ctx.children.length===3
      && ctx.children[0] instanceof TerminalNode
      && ctx.children[0].text === "return") {
        if(!this.scopes[this.scopes.length-1].dataStorage) {
          this.scopes[this.scopes.length-1].dataStorage = {
            returns: []
          }
        }
        this.scopes[this.scopes.length-1].dataStorage?.returns.push(this.visit(ctx.children[1]));
      }
    return "";
  }

  visitTerminal(node: TerminalNode): string {
      if(node._symbol.type === CLexer.StringLiteral) {
        return this.useConstant(node.text);
      }
      return "";
  }
}