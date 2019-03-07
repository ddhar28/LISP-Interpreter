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

let env = {
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
  'list': (...list) => list
}

function value (inp) {
  let val
  if (!(val = numparse(inp))) {
    if (!(val = strparse(inp))) {
      if ((val = evaluate(inp)) === null) return null
    }
  }
  return val
}

function defineParser (inp) {
  let symbol; let str = inp.slice(0); let value
  if (!(symbol = strparse(inp))) return null
  str = symbol[1]
  if (!(value = evaluate(str))) return null
  env[symbol[0]] = value[0]
  return value[1]
}

function ifParser (inp) {
  let test; let val; let alt
  if (!(test = value(inp))) return null
  val = value(test[1])
  alt = value(val[1])
  if (test[0]) {
    if (!val) return null
    return [val[0], alt[1]]
  } else {
    if (!alt) return null
    return alt
  }
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

function opParser (inp) {
  let str = inp.slice(0); let op; let args = []; let val
  if (env[(op = str.slice(0, str.indexOf(' ')))] === undefined) return null
  str = spaceparse(str.slice(op.length))
  while (!str.startsWith(')')) {
    if ((val = numparse(str))) {
      args.push(val[0])
    } else if ((val = strparse(str))) {
      if (env[val[0]] === undefined) return null
      args.push(env[val[0]])
    } else if (str[0] === '(') {
      if (!(val = evaluate(str))) return null
      args.push(val[0])
    }
    str = val[1]
    if (!str.length) return null
  }
  return [env[op](...args), str]
}

function expParser (inp) {
  let str = inp.slice(0); let result
  while (!str.startsWith(')')) {
    if (str.startsWith('begin ')) {
      if (!(result = evaluate(spaceparse(inp.slice(6))))) return null
      str = result[1]
    } else if (str.startsWith('define ')) {
      if (!(str = defineParser(spaceparse(inp.slice(7))))) return null
      result = ['', str]
    } else if (str.match(/^(\+|-|\/|\*|<|>|=|<=|>=|list) /)) {
      if (!(result = opParser(str))) return null
      str = result[1]
    } else if (str.startsWith('if ')) {
      if (!(result = ifParser(spaceparse(str.slice(3))))) return null
      str = result[1]
    } else if (str.startsWith('quote ')) {
      if (!(result = disp(spaceparse(str.slice(6))))) return null
      str = result[1]
    } else break
  }
  return result
}

function evaluate (inp) {
  let str = inp.slice(0); let result; let val
  while (str.length && !str.startsWith(')')) {
    if (str.startsWith('(')) {
      if (!(result = expParser(spaceparse(str.slice(1))))) return null
      str = result[1]
    }
    if ((val = numparse(str))) {
      result = val; str = val[1]; break
    }
    if ((val = strparse(str))) {
      result = (env[val[0]] === undefined ? null : [env[val[0]], val[1]]); str = val[1]; break
    }
  }
  str = spaceparse(str.slice(1))
  return [result[0], str]
}

prompt(function (input) {
  let result = evaluate(input)
  console.log(result ? result[0] : 'Invalid')
  process.exit()
})
