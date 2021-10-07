import { Parser, ParserRuleContext } from 'antlr4ts';
import { AbstractParseTreeVisitor } from 'antlr4ts/tree/AbstractParseTreeVisitor'
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import { assign, cond, get, isString } from 'lodash';
import { CLexer } from './grammars/c/CLexer';
import { ArgumentExpressionListContext, AssignmentExpressionContext, UnaryOperatorContext, EqualityExpressionContext, AdditiveExpressionContext, LogicalAndExpressionContext, PostfixExpressionContext, RelationalExpressionContext, SelectionStatementContext, StatementContext, PrimaryExpressionContext, LogicalOrExpressionContext, MultiplicativeExpressionContext, UnaryExpressionContext, CompoundStatementContext, BlockItemListContext, BlockItemContext, IterationStatementContext, ShiftExpressionContext  } from './grammars/c/CParser';
import {CVisitor} from './grammars/c/CVisitor'
import { Block, BlockType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { ParseTree } from 'antlr4ts/tree/ParseTree';

// Extend the AbstractParseTreeVisitor to get default visitor behaviour
export class MyCVisitor extends AbstractParseTreeVisitor<string> implements CVisitor<string> {

  public vars : {[variable: string]: string} = {};
  public blocks: Block[] = [];

  /*private addOperation(variable: string) : {
    pre: string,
    post: string,
  } {
    if(!this.vars[variable]) {
      this.vars[variable] = 0;
    }
    this.vars[variable]+=1;
    return {
      pre: variable+"|"+(this.vars[variable]-1),
      post: variable+"|"+this.vars[variable]
    }
  }*/

  private useVariable(v: string) : string {
    if(!this.vars[v]) {
      this.vars[v] = this.id();
      this.addBlock("var", [], [this.vars[v]], v);
    }
    return this.vars[v];
  }

  private useConstant(v: string) : string {
    const id = this.id();
    this.addBlock("const", [], [id], v);
    return id;
  }

  private setVariable(v: string, newValue:string) : void {
    this.vars[v] = newValue;
  }

  defaultResult() : string {
    return "";
  }

  id(): string {
    return uuidv4();
  }

  private addBlock(type: BlockType, inputs: string[] = [], outputs: string[] = [], configuration: string|string[] = []) : void {
    this.blocks.push({
      type,
      inputs,
      outputs,
      configuration
    });
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
      } else if(operator === "+=") {
        const operators = ["+", "+"];
        const parts = [this.useVariable(leftVar), expression];
        const output = this.id();
        this.addBlock("sum", parts, [output], operators);
        return output;
      } else if(operator === "-=") {
        const operators = ["+", "-"];
        const parts = [this.useVariable(leftVar), expression];
        const output = this.id();
        this.addBlock("sum", parts, [output], operators);
        return output;
      } else {
        throw new Error("Operator '"+operator+"' is not supported yet!");
      }
    }
    return this.visitChildren(context);
  }

  /*visitBlockItem(context: BlockItemContext) {
    console.log(context.text);
    this.visitChildren(context);
    return [];
  }*/

  visitAdditiveExpression(context: AdditiveExpressionContext) : string {
    if(context.children
      && context.children.length>=3
    ) {
      const operators = context.children.filter((i,idx)=>idx%2===1).map(i=>i.text);
      operators.splice(0,0,"+");
      const parts : string[] = context.children.filter((i,idx)=>idx%2===0).map(i=>this.visit(i)).filter((i)=>isString(i));
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
      const parts : string[] = context.children.filter((i,idx)=>idx%2===0).map(i=>this.visit(i)).filter((i)=>isString(i));
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
      const parts : string[] = context.children.filter((i,idx)=>idx%2===0).map(i=>this.visit(i)).filter((i)=>isString(i));
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
      //console.log(functionName);
      //console.log(args.map((i:ParserRuleContext)=>i.text));
      /*const argRes = args.map((i:ParserRuleContext)=>this.visit(i));
      return [];*/
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
    //return "";
  }

  /*visitMultiportSwitch(context: SelectionStatementContext, variable: string) {
    const assignmentVarIf = get(context, "children[4].children[0].children[1].children[0].children[0].children[0].children[0].children[0].children[0].children[0].text");
    const ifStatementChildren = get(context, "children[4].children[0].children[1].children[0].children");

  }*/

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
      //console.log("switch");
      //console.log(condition.text);
      //this.visitChildren(condition);
      //console.log(ifExpr.text);
      //console.log(elseExpr.text);
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
    ) {
      const ifExpr = ifStatementChildren[0].children[0].children[0].children[0].children[2];
      const elseExpr = elseStatementChildren[0].children[0].children[0].children[0].children[2];
      //console.log("switch");
      //console.log(condition.text);
      //this.visitChildren(condition);
      //console.log(ifExpr.text);
      //console.log(elseExpr.text);
      const out = this.id();
      const params = [this.visit(ifExpr), this.visit(condition), this.visit(elseExpr)];
      this.setVariable(assignmentVarIf, out);
      this.addBlock("switch", params, [out]);
      return out;
    }

    if(assignmentVarIf) {
      //console.log("unresolved if");

      const ms = this.visitMultiSwitch(leftVar, assignmentVarIf, context);
      
      if(ms) {
        const out = this.id();
        const params = [this.useVariable(leftVar), ...ms.map(i=>this.visit(i.value))];
        this.setVariable(assignmentVarIf, out);
        this.addBlock("multiswitch", params, [out], ms.map(i=>i.condition).join("\n"));
        return out;
      }

      /*if(context.children
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
      )
        console.log(get(context, "children[6].children[0].children[1].children[0].children[0].children[0]"));
      */
    }

    return this.visitChildren(context);
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
    /*if(context.children
      && context.children.length>1) {
        console.log("unary: " + context.text);
      }*/
    return this.visitChildren(context);
  }

  visitIterationStatement(context: IterationStatementContext) : string {
    console.log("Iterations are not evaluated!");
    return "";
  }
}