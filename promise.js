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
    return new Asuna((resolve, reject) => {
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
            try {
              let result = onFulfilled(value)
              if (result instanceof Asuna) {
                result.then(resolve, reject)
              } else {
                resolve(result)
              }
            } catch (error) {
              reject(error)
            }
          },
          onRejected: reason => {
            try {
              let result = onRejected(reason)
              if (result instanceof Asuna) {
                result.then(resolve, reject)
              } else {
                resolve(result)
              }
            } catch (error) {
              reject(error)
            }
          }
        })
      }

      if (this.state === FULFILLED) {
        // 放入任务队列，做异步
        setTimeout(() => {
          try {
            let result = onFulfilled(this.value)
            if (result instanceof Asuna) {
              result.then(resolve, reject)
            } else {
              resolve(result)
            }
          } catch (error) {
            reject(error)
          }
        }, 0);
      }

      if (this.state === REJECTED) {
        setTimeout(() => {
          try {
            let result = onRejected(this.value)
            // 注意这里要写成功的，因为第二个promise就是成功的
            if (result instanceof Asuna) {
              result.then(resolve, reject)
            } else {
              resolve(result)
            }
          } catch (error) {
            reject(error)
          }
        }, 0);
      }
    })
  }
}