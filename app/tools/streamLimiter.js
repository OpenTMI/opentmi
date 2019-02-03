const {Transform} = require('stream');


class Limiter extends Transform {
  constructor(options) {
    super(options);
    this._toSkip = options.skip;
    this._limit = options.limit;
  }
  _push(chunk) {
    if (chunk.length > this._limit) {
      this.push(chunk.slice(0, this._limit));
      this._limit = 0;
      this.end();
    } else {
      this.push(chunk);
      this._limit -= chunk.length;
    }
  }
  _transform(chunk, enc, cb) {
    if (this._toSkip === 0) {
      this._push(chunk);
    } else if (this._toSkip > chunk.length) {
      this._toSkip -= chunk.length;
    } else {
      if (this._toSkip !== chunk.length) {
        this._push(chunk.slice(this._toSkip));
      }
      this._toSkip = 0;
    }
    cb();
  }
}

module.exports = Limiter;