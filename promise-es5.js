/**
 * Promise Implement in ES5
 * from: https://www.promisejs.org/implementing/
 */
var PENDING = 0
var FULFILLED = 1
var REJECTED = 2

function Promise(fn) {
  // 存储状态，初始为 PENDING
  var state = PENDING

  // 当 FULFILLED 或 REJECTED 之后存储值或者错误
  var value = null

  // store sucess & failure handlers attached by calling .then or .done
  var handlers = []

  function fulfill(result) {
    state = FULFILLED
    value = result
    handlers.forEach(handle)
    handlers = null
  }

  function reject(error) {
    state = REJECTED
    value = error
    handlers.forEach(handle)
    handlers = null
  }

  function resolve(result) {
    try {
      var then = getThen(result)

      if (then) {
        doResolve(then.bind(result), resolve, reject)
        return
      }
      fulfill(result)
    } catch (e) {
      reject(e)
    }
  }

  function handle(handler) {
    if (state === PENDING) {
      handlers.push(handler)
    } else {
      if (state === FULFILLED &&
        typeof handler.onFulfilled === 'function') {
        handler.onFulfilled(value)
      }
      if (state === REJECTED &&
        typeof handler.onRejected === 'function') {
        handler.onRejected(value)
      }
    }
  }

  this.done = function (onFulfilled, onRejected) {
    // do this in the next tick
    setTimeout(function () {
      handler({
        onFulfilled: onFulfilled,
        onRejected: onRejected
      })
    }, 0)
  }

  this.then = function (onFulfilled, onRejected) {
    var self = this
    return new Promise(function (resolve, reject) {
      return self.done(function (result) {
        if (typeof onFulfilled === 'function') {
          try {
            return resolve(onFulfilled(result))
          } catch (e) {
            return reject(e)
          }
        } else {
          return resolve(result)
        }
      }, function (error) {
        if (typeof onRejected === 'function') {
          try {
            return resolve(onRejected(error))
          } catch (e) {
            return reject(e)
          }
        } else {
          return reject(error)
        }
      })
    })
  }

  doResolve(fn, resolve, reject)
}


/**
 * Check if a value is a Promise and, if it is,
 * return the `then` method of that promise.
 * 
 * @param {Promise | Any} value 
 */
function getThen(value) {
  var t = typeof value
  if (value && (t === 'object' || t === 'function')) {
    var then = value.then
    if (typeof then === 'function') {
      return then
    }
  }
  return null
}


/**
 * 确保只会 resolve 或者 reject 一次
 *
 * Makes no guarantees about asynchrony.
 *
 * @param {Function} fn A resolver function that may not be trusted
 * @param {Function} onFulfilled
 * @param {Function} onRejected
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (e) {
    if (done) return
    done = true
    onRejected(e)
  }
}