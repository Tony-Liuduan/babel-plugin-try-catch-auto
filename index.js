module.exports = function (babel) {

    const t = babel.types

    const wrapCapture = babel.template(`{
        try {
            FUNC_BODY
        } catch (ERROR_VARIABLE) {
            console.log(ERROR_VARIABLE)
            console.log(FUNC_NAME)
            console.log(FUNC_LINE)
        }
    }`)

    return {
        visitor: {
            FunctionDeclaration(path, _ref = { opts: {} }) {

                const funcBody = path.node.body.body
                const funcId = path.node.id
                const funcName = funcId ? funcId.name : 'anonymous function'
                const funcLine = path.node.loc.start.line
                const funcErrorVariable = path.scope.generateUidIdentifier('e')

                if (funcBody.length === 0) {
                    return
                }

                const ast = wrapCapture({
                    FUNC_BODY: funcBody,
                    FUNC_NAME: t.StringLiteral(funcName),
                    FUNC_LINE: t.NumericLiteral(funcLine),
                    ERROR_VARIABLE: funcErrorVariable
                })

                path.get('body').replaceWith(ast)
            }
        }
    }
}