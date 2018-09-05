const handleFuncBody = (path, _ref = { opts: {} }, t, wrapCapture, wrapCaptureWithReturn) => {

    const funcId = path.node.id || path.node.key
    const funcLoc = path.node.loc
    let funcBody = path.node.body.body
    let isReturnBody = false


    // 过滤 
    if (funcBody && funcBody.length === 0) {
        return
    }

    if (!funcLoc) {
        return
    }

    if (!funcBody) {
        isReturnBody = true
        funcBody = path.node.body
    }

    // 记录 ast 上的重要信息
    const funcName = funcId ? funcId.name : 'anonymous'
    const funcLine = funcLoc.start.line
    const funcErrorVariable = path.scope.generateUidIdentifier('e')
    const astTemplate = isReturnBody ? wrapCaptureWithReturn : wrapCapture

    const ast = astTemplate({
        FUNC_BODY: funcBody,
        FUNC_NAME: t.StringLiteral(funcName),
        FUNC_LINE: t.NumericLiteral(funcLine),
        ERROR_VARIABLE: funcErrorVariable
    })

    path.get('body').replaceWith(ast)
}

const catchTemplate = `
        try {
            window.JSTracker && window.JSTracker.catch({
                message: ERROR_VARIABLE.message,
                stack: ERROR_VARIABLE.stack.toString(),
                funcLine: FUNC_LINE,
                funcName: FUNC_NAME
            }, 'try-catch')
        } catch (trackerError) {
            console.log(trackerError)
        }
        throw ERROR_VARIABLE
    `


module.exports = function (babel) {

    const t = babel.types

    const wrapCapture = babel.template(`{
        try {
            FUNC_BODY
        } catch (ERROR_VARIABLE) {
            ${catchTemplate}
        }
    }`)

    const wrapCaptureWithReturn = babel.template(`{
        try {
            return FUNC_BODY
        } catch (ERROR_VARIABLE) {
            ${catchTemplate}
        }
    }`)

    return {
        visitor: {
            FunctionDeclaration(path, _ref = { opts: {} }) {

                handleFuncBody(path, _ref = { opts: {} }, t, wrapCapture, wrapCaptureWithReturn)

            },
            ArrowFunctionExpression(path, _ref = { opts: {} }) {

                handleFuncBody(path, _ref = { opts: {} }, t, wrapCapture, wrapCaptureWithReturn)

            },
            FunctionExpression(path, _ref = { opts: {} }) {

                handleFuncBody(path, _ref = { opts: {} }, t, wrapCapture, wrapCaptureWithReturn)

            },
            ClassDeclaration(path, _ref = { opts: {} }) {

                let bodyPaths = path.get('body').get('body')

                if (!bodyPaths) {
                    return
                }

                if (bodyPaths.length === 0) {
                    return
                }

                bodyPaths.forEach(bodyPath => {

                    const { type, key } = bodyPath.node || {}

                    // 只捕获方法中的错误，属性错误不处理
                    if (type !== 'ClassMethod') return

                    if (!key) return

                    // 防止报错，使用 react-catch 捕获render中的错误
                    if (key.name === 'render') return

                    handleFuncBody(bodyPath, _ref = { opts: {} }, t, wrapCapture, wrapCaptureWithReturn)

                });
            }
        }
    }
}