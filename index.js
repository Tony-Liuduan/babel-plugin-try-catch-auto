const handleFuncBody = (path, _ref = { opts: {} }, t, wrapCapture, wrapCaptureWithReturn) => {

    // const funcId = path.node.id || path.node.key
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
    const funcErrorVariable = path.scope.generateUidIdentifier('e')
    // const funcName = t.StringLiteral(funcId ? funcId.name : 'anonymous')
    // const funcLine = t.NumericLiteral(funcLoc.start.line)

    const astTemplate = isReturnBody ? wrapCaptureWithReturn : wrapCapture

    const ast = astTemplate({
        FUNC_BODY: funcBody,
        ERROR_VARIABLE: funcErrorVariable
    })

    path.get('body').replaceWith(ast)
}

const catchTemplate = `
    try { 
        window.JSTracker.catch(ERROR_VARIABLE)
    } catch (e) {
    }
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

    const wrapCaptureWithThrow = babel.template(`{
        try {
            FUNC_BODY
        } catch (ERROR_VARIABLE) {
            ${catchTemplate}
            throw ERROR_VARIABLE
        }
    }`)

    const wrapCaptureWithReturn = babel.template(`{
        try {
            return FUNC_BODY
        } catch (ERROR_VARIABLE) {
            ${catchTemplate}
        }
    }`)

    const wrapCaptureWithReturnWithThrow = babel.template(`{
        try {
            return FUNC_BODY
        } catch (ERROR_VARIABLE) {
            ${catchTemplate}
            throw ERROR_VARIABLE
        }
    }`)

    return {
        visitor: {
            Function(path, _ref = { opts: {} }) {
                const { throwError } = _ref.opts

                let capture = wrapCaptureWithThrow
                let captureWithReturn = wrapCaptureWithReturnWithThrow

                if (throwError === false) {
                    capture = wrapCapture
                    captureWithReturn = wrapCaptureWithReturn
                }

                handleFuncBody(path, _ref = { opts: {} }, t, capture, captureWithReturn)

            },
            ClassDeclaration(path, _ref = { opts: {} }) {

                let bodyPaths = path.get('body').get('body')

                if (!bodyPaths) {
                    return
                }

                if (bodyPaths.length === 0) {
                    return
                }

                const { throwError } = _ref.opts

                let capture = wrapCaptureWithThrow
                let captureWithReturn = wrapCaptureWithReturnWithThrow

                if (throwError === false) {
                    capture = wrapCapture
                    captureWithReturn = wrapCaptureWithReturn
                }

                bodyPaths.forEach(bodyPath => {

                    const { type, key } = bodyPath.node || {}

                    // 只捕获方法中的错误，属性错误不处理
                    if (type !== 'ClassMethod') return

                    if (!key) return

                    // 防止报错，使用 react-catch 捕获render中的错误
                    if (key.name === 'render') return

                    handleFuncBody(bodyPath, _ref = { opts: {} }, t, capture, captureWithReturn)

                });
            }
        }
    }
}