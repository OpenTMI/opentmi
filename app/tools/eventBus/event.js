const TYPES = [
  'message',
  'event',
  'log'
];

class Event {
  constructor(data, name, type = 'message', meta = {}) {
    this.data = data;
    this.name = name;

    if (TYPES.indexOf(type) === -1) {
      throw new Error(`Invalid type of event: ${type}, expected one of: [${TYPES.toString()}].`);
    }
    this.type = type;

    if (!(meta instanceof Object)) {
      throw new Error(`Invalid type for meta: ${typeof meta}, expected object.`);
    }
    this.meta = meta;
  }

  toString() {
    return `[${this.type}] ${this.name}(${JSON.stringify(this.meta)}): ${JSON.stringify(this.data)}.`;
  }

  toJSON() {
    return {
      data: this.data,
      name: this.name,
      type: this.type,
      meta: this.meta
    };
  }

  static fromObject(jsonObject) {
    const {name} = jsonObject;
    const {type} = jsonObject;
    const {meta} = jsonObject;
    const {data} = jsonObject;

    return new Event(data, name, type, meta);
  }
}

module.exports = Event;
