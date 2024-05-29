function generateOpenQASM(ast) {
    const output = [];
  
    function generateStatement(statement) {
      switch (statement.type) {
        case "FunctionStatement":
          output.push(`qreg ${statement.name.value}[${statement.args.length}];`);
          output.push(`${statement.name.value} = {`);
          statement.body.body.forEach((stmt) => {
            generateStatement(stmt);
          });
          output.push("}");
          break;
        case "Statement":
          output.push(generateExpression(statement.expression) + ";");
          break;
        case "If":
          output.push("if (");
          output.push(generateExpression(statement.condition));
          output.push(") {");
          generateStatement(statement.then);
          output.push("}");
          if (statement.else) {
            output.push(" else {");
            generateStatement(statement.else);
            output.push("}");
          }
          break;
        default:
          throw new Error(`Unsupported statement type: ${statement.type}`);
      }
    }
  
    function generateExpression(expression) {
      switch (expression.type) {
        case "FunctionCall":
          const args = expression.arguments.map(generateExpression).join(", ");
          return `${expression.name.value}(${args})`;
        case "BinaryExpression":
          const left = generateExpression(expression.left);
          const right = generateExpression(expression.right);
          const operator = expression.operatorToken.type === "PlusToken" ? "+" : "*";
          return `${left} ${operator} ${right}`;
        case "Id":
          return expression.value;
        case "NumericLiteral":
          return expression.value;
        case "String":
          return `"${expression.value}"`;
        case "RegExpToken":
          return `/${expression.value.pattern}/${expression.value.flags}`;
        default:
          throw new Error(`Unsupported expression type: ${expression.type}`);
      }
    }
  
    ast.forEach(generateStatement);
    return output.join("\n");
  }







  //To RUN
const { ast } = parser(tokens);
const openQASMCode = generateOpenQASM(ast);
console.log(openQASMCode);