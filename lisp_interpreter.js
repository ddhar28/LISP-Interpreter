'use strict'

function prompt (callback) {
  let stdin = process.stdin
  stdin.resume()
  stdin.once('data', function (data) {
    callback(data.toString().trim())
  })
}

function spaceparse (inp) {
  while (inp[0] === ' ') inp = inp.slice(1)
  return inp
}

function numparse (inp) {
  let result
  return (result = inp.match(/^(-?\d+\.?\d*)/)) && [+result[0], spaceparse(inp.slice(result[0].length))]
}

function strparse (inp) {
  let result
  return (result = inp.match(/^([a-zA-z]\w*)/)) && [result[0], spaceparse(inp.slice(result[0].length))]
}

let globalEnv = {
  '+': (...list) => list.reduce((x, y) => x + y),
  '-': (...list) => list.reduce((x, y) => x - y),
  '*': (...list) => list.reduce((x, y) => x * y),
  '/': (...list) => list.reduce((x, y) => x / y),
  '<': (x, y) => x < y,
  '>': (x, y) => x > y,
  '=': (x, y) => x === y,
  '>=': (x, y) => x >= y,
  '<=': (x, y) => x <= y,
  'pi': Math.PI,
  'list': (...list) => list,
  'parent': null
}

function findparent (val, env) {
  if (env !== null) {
    if (env[val] === undefined) return findparent(val, env.parent)
    return env[val]
  }
  return undefined
}

function value (inp, env = globalEnv) {
  if (inp === null) return null
  let val
  if (!(val = numparse(inp))) {
    if (!(val = strparse(inp))) {
      if ((val = expParser(spaceparse(inp.slice(1)), env)) === null) return null
    } else {
      if ((val[0] = findparent([val[0]], env)) === undefined) return null
      // val[0] = env[val[0]]
    }
  }
  return val
}

function defineParser (inp, env = globalEnv) {
  let symbol; let str = inp.slice(0); let val
  if (!(symbol = strparse(inp))) return null
  str = symbol[1]
  if (!(val = evaluate(str, env))) return null
  env[symbol[0]] = val[0]
  console.log(symbol[0], env[symbol[0]])
  return val[1]
}

function ifParser (inp, env = globalEnv) {
  let test; let val; let alt
  console.log('input', inp)
  if (!(test = value(inp, env))) return null
  if (test[1].startsWith(')')) test[1] = spaceparse(test[1].slice(1))
  console.log('test', test)
  if (!(val = value(test[1], env))) return null
  if (val[1].startsWith(')')) val[1] = spaceparse(val[1].slice(1))
  console.log('val', val)
  alt = disp(val[1])
  // if (!(alt = value(val[1], env))) return null
  console.log('alt', alt)
  if (!alt[1].startsWith(')')) return null
  if (test[0]) {
    if (!val) return null
    return [val[0], alt[1]]
  } else {
    if (!(alt = value(val[1], env))) return null
    return alt
  }
}

function lambda (inp, env = globalEnv) {
  let args = []; let obj = {}
  let par; let count = 1; let def = '('
  let str = spaceparse(inp.slice(1))
  while (!str.startsWith(')')) {
    par = strparse(str)
    args.push(par[0])
    str = par[1]
  }
  for (let x of args) obj[x] = null
  str = spaceparse(str.slice(str.indexOf('(') + 1))
  // console.log('starting def', str)
  while (count) {
    if (str.startsWith('(')) count++
    if (str.startsWith(')')) count--
    def += str[0]
    // console.log(def)
    if (!count) break
    str = str.slice(1)
    if (!str.length) return null
  }
  obj['def'] = def
  obj['parent'] = env
  return [obj, spaceparse(str)]
}

function disp (inp) {
  let str = inp.slice(0); let count = 1; let result = ''
  while (count) {
    if (str.startsWith('(')) count++
    else if (str.startsWith(')')) count--
    if (!count) break
    result += str[0]; str = str.slice(1)
    if (!str.length) return null
  }
  return [result, str]
}

function opParser (inp, env = globalEnv) {
  console.log('operation', inp)
  if (inp === null) return null
  let str = inp.slice(0); let op; let args = []; let val
  if (findparent((op = str.slice(0, str.indexOf(' '))), env) === undefined) return null
  str = spaceparse(str.slice(op.length))
  while (!str.startsWith(')')) {
    if (str.startsWith('(')) {
      let exp = expParser(spaceparse(str.slice(1)), env)
      args.push(exp[0])
      str = spaceparse(exp[1].slice(1))
    } else if ((val = value(str, env))) {
      args.push(val[0])
      str = val[1]
    } else return null
    console.log(args, str)
    if (!str.length) return null
  }
  console.log('exiting operation', op, args)
  return [findparent(op, env)(...args), str]
}

function func (inp, env = globalEnv) {
  // console.log('received func', inp)
  let i = 0
  let str = inp[1].slice(0); let args = []; let val
  while (!str.startsWith(')')) {
    if (str.startsWith('(')) {
      let exp = expParser(spaceparse(str.slice(1)), env)
      args.push(exp[0])
      str = spaceparse(exp[1].slice(1))
    } else if ((val = value(str, env))) {
      args.push(val[0])
      str = val[1]
    } else return null
    if (!str.length) return null
  }
  args.push(inp[0].def, inp[0].parent)
  for (let index in inp[0]) inp[0][index] = args[i++]
  // console.log(inp[0], str)
  let result = evaluate(inp[0].def, inp[0])
  console.log('function returns', spaceparse(str))
  return [result[0], spaceparse(str)]
}

function expParser (inp, env = globalEnv) {
  console.log('exp', inp)
  if (inp === null) return null
  let str = inp.slice(0); let result
  while (!str.startsWith(')')) {
    if (str.startsWith('begin ')) {
      if (!(result = evaluate(spaceparse(inp.slice(6)), env))) return null
      str = result[1]
    } else if (str.startsWith('define ')) {
      str = defineParser(spaceparse(inp.slice(7)), env)
      result = ['', str]
    } else if (str.match(/^(\+|-|\/|\*|<|>|=|<=|>=|list) /)) {
      if (!(result = opParser(str, env))) return null
      str = result[1]
    } else if (str.startsWith('if ')) {
      if (!(result = ifParser(spaceparse(str.slice(3)), env))) return null
      str = result[1]
    } else if (str.startsWith('quote ')) {
      if (!(result = disp(spaceparse(str.slice(6))))) return null
      str = result[1]
    } else if (str.startsWith('lambda ')) {
      if (!(result = lambda(spaceparse(str.slice(7))))) return null
      str = result[1]
    } else if ((result = strparse(str))) {
      if (!result || findparent(result[0], env) === undefined || typeof (findparent(result[0], env)) !== 'object') return null
      console.log('function encountered')
      result = func([findparent(result[0], env), result[1]], env)
      str = result[1]
    }
  }
  console.log('exit exp', result)
  return result
}

function evaluate (inp, env = globalEnv) {
  console.log('eval', inp)
  if (inp === null) return null
  let str = inp.slice(0); let result; let val
  while (str.length && !str.startsWith(')')) {
    if (str.startsWith('(')) {
      if (!(result = expParser(spaceparse(str.slice(1)), env))) return null
      str = result[1]
      console.log('received exp')
      if (str.indexOf(')') === -1) return null
      str = spaceparse(str.slice(1))
    }
    if ((val = numparse(str))) {
      result = val; str = val[1]; break
    }
    if ((val = strparse(str))) {
      result = findparent(val[0], env)
      result = (result === undefined ? null : [result, val[1]])
      // result = (env[val[0]] === undefined ? null : [env[val[0]], val[1]])
      str = val[1]; break
    }
  }
  console.log('exit eval', result[0], spaceparse(str))
  if (!result) return null
  // if (str === '') return result[0]
  return [result[0], spaceparse(str)]
}

function output (result) {
  if (typeof (result) === 'object' && result.length > 1) return output(result[0])
  return result
}

prompt(function (input) {
  let result = evaluate(input, globalEnv)
  console.log(!result ? 'Invalid' : output(result))
  process.exit()
})
