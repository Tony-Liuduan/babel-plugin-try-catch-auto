const handleFuncBody = (path, _ref = { opts: {} }) => {
    let funcBody = path.node.body.body
    const funcId = path.node.id
    const funcLoc = path.node.loc
    let flag = false

    if (!funcBody) {
        flag = true
        funcBody = path.node.body
    }

    if (funcBody && funcBody.length === 0) {
        return
    }

    if (!funcLoc) {
        return
    }

    const funcName = funcId ? funcId.name : 'anonymous function'
    const funcLine = funcLoc.start.line
    const funcErrorVariable = path.scope.generateUidIdentifier('e')

    const astTemplate = flag ? wrapCaptureWithReturn : wrapCapture

    const ast = astTemplate({
        FUNC_BODY: funcBody,
        FUNC_NAME: t.StringLiteral(funcName),
        FUNC_LINE: t.NumericLiteral(funcLine),
        ERROR_VARIABLE: funcErrorVariable
    })

    path.get('body').replaceWith(ast)
}

module.exports = function (babel) {

    const t = babel.types

    const wrapCapture = babel.template(`{
        try {
            FUNC_BODY
        } catch (ERROR_VARIABLE) {
            console.log('+++++++++++++++++++++')
            console.log(ERROR_VARIABLE)
            console.log(FUNC_NAME)
            console.log(FUNC_LINE)
            console.log('+++++++++++++++++++++')
        }
    }`)

    const wrapCaptureWithReturn = babel.template(`{
        try {
            return FUNC_BODY
        } catch (ERROR_VARIABLE) {
            console.log('+++++++++++++++++++++')
            console.log(ERROR_VARIABLE)
            console.log(FUNC_NAME)
            console.log(FUNC_LINE)
            console.log('+++++++++++++++++++++')
        }
    }`)

    return {
        visitor: {
            FunctionDeclaration(path, _ref = { opts: {} }) {

                const funcBody = path.node.body.body
                const funcId = path.node.id
                const funcLoc = path.node.loc

                if (funcBody.length === 0) {
                    return
                }

                if (!funcLoc) {
                    return
                }

                const funcName = funcId ? funcId.name : 'anonymous function'
                const funcLine = funcLoc.start.line
                const funcErrorVariable = path.scope.generateUidIdentifier('e')


                const ast = wrapCapture({
                    FUNC_BODY: funcBody,
                    FUNC_NAME: t.StringLiteral(funcName),
                    FUNC_LINE: t.NumericLiteral(funcLine),
                    ERROR_VARIABLE: funcErrorVariable
                })

                path.get('body').replaceWith(ast)
            },
            ArrowFunctionExpression(path) {
                let funcBody = path.node.body.body
                const funcId = path.node.id
                const funcLoc = path.node.loc
                let flag = false

                if (!funcBody) {
                    flag = true
                    funcBody = path.node.body
                }

                if (funcBody && funcBody.length === 0) {
                    return
                }

                if (!funcLoc) {
                    return
                }

                const funcName = funcId ? funcId.name : 'anonymous function'
                const funcLine = funcLoc.start.line
                const funcErrorVariable = path.scope.generateUidIdentifier('e')

                const astTemplate = flag ? wrapCaptureWithReturn : wrapCapture

                const ast = astTemplate({
                    FUNC_BODY: funcBody,
                    FUNC_NAME: t.StringLiteral(funcName),
                    FUNC_LINE: t.NumericLiteral(funcLine),
                    ERROR_VARIABLE: funcErrorVariable
                })

                path.get('body').replaceWith(ast)
            },
            FunctionExpression(path) {
                const funcBody = path.node.body.body

                const funcId = path.node.id
                const funcLoc = path.node.loc

                if (!funcBody) {
                    return
                }

                if (funcBody.length === 0) {
                    return
                }

                if (!funcLoc) {
                    return
                }

                const funcName = funcId ? funcId.name : 'anonymous function'
                const funcLine = funcLoc.start.line
                const funcErrorVariable = path.scope.generateUidIdentifier('e')

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