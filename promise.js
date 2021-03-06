const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class Asuna {
  constructor(executor) {
    this.state = PENDING

    // 存储值，可能是 fulfilled 后的值，也可能是 rejected 后的原因（reason）
    this.value = null

    // 暂存等待状态拿到的函数，等状态改变了再执行
    this.callbacks = []

    // 下面 try - catch 捕获函数体中的异常
    try {
      executor(this.resolve.bind(this), this.reject.bind(this))
    } catch (error) {
      this.reject(error)
    }
  }

  resolve(value) {
    if (this.state === PENDING) {
      this.state = FULFILLED
      this.value = value
      setTimeout(() => {
        this.callbacks.map(callback => {
          callback.onFulfilled(value)
        })
      });
    }
  }

  reject(reason) {
    if (this.state === PENDING) {
      this.state = REJECTED
      this.value = reason
      setTimeout(() => {
        this.callbacks.map(callback => {
          callback.onRejected(reason)
        })
      });
    }
  }

  then(onFulfilled, onRejected) {
    // 注意，新的 promise 是新的状态，
    // 并不是说我上个 promise reject 了，
    // 新的 promise 也是 reject。
    let asuna = new Asuna((resolve, reject) => {
      // 实现 then 的传递穿透
      if (typeof onFulfilled !== 'function') {
        onFulfilled = () => this.value
      }

      if (typeof onRejected !== 'function') {
        onRejected = () => this.value
      }

      // 将一组 resolve, reject 函数先放到 callbacks 数组里边去
      if (this.state === PENDING) {
        this.callbacks.push({
          onFulfilled: value => {
            this.parse(asuna, onFulfilled(value), resolve, reject)
          },
          onRejected: reason => {
            this.parse(asuna, onRejected(reason), resolve, reject)
          }
        })
      }

      if (this.state === FULFILLED) {
        // 放入任务队列，做异步
        setTimeout(() => {
          this.parse(asuna, onFulfilled(this.value), resolve, reject)
        }, 0);
      }

      if (this.state === REJECTED) {
        setTimeout(() => {
          this.parse(asuna, onRejected(this.value), resolve, reject)
        }, 0);
      }
    })

    return asuna
  }

  /**
   * 判断返回是否为 Asuna
   */
  parse(asuna, result, resolve, reject) {
    if (asuna === result) {
      throw new TypeError('Chaining cycle detected for promise')
    }
    try {
      if (result instanceof Asuna) {
        result.then(resolve, reject)
      } else {
        resolve(result)
      }
    } catch (error) {
      reject(error)
    }
  }

  static resolve(value) {
    return new Asuna((resolve, reject) => {
      if (value instanceof Asuna) {
        value.then(resolve, reject)
      } else {
        resolve(value)
      }
    })
  }

  static reject(value) {
    return new Asuna((resolve, reject) => {
      if (value instanceof Asuna) {
        value.then(resolve, reject)
      } else {
        reject(value)
      }
    })
  }

  /**
   * Asuna.all() Implement
   * 执行所有，全部成功 则 resolve
   * 任何一个失败就 reject
   */
  static all(promises) {
    return new Asuna((resolve, reject) => {
      const values = []
      promises.forEach((promise) => {
        promise.then(value => {
          values.push(value)
          if (values.length === promises.length) {
            resolve(values)
          }
        }, reason => {
          reject(reason)
        })
      })
    })
  }

  /**
   * Asuna.race() Implement
   * Promise 数组中哪个最快返回哪个
   */
  static race(promises) {
    return new Asuna((resolve, reject) => {
      promises.map(promise => {
        promise.then(value => {
          resolve(value)
        }, reason => {
          reject(reason)
        })
      })
    })
  }
}

// let Promise = Asuna

// Promise.defer = Promise.deferred = function () {
//   let dfd = {}
//   dfd.promise = new Promise((resolve, reject) => {
//     dfd.resolve = resolve;
//     dfd.reject = reject;
//   });
//   return dfd;
// }

// module.exports = Promise