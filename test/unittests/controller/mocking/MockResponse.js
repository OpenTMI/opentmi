class MockResponse {
  constructor(jsonTest, statusTest) {
    this.jsonTest = jsonTest;
    this.statusTest = statusTest;
  }

  json(value) {
    if (this.jsonTest) this.jsonTest(value);
  }

  status(value) {
    if (this.statusTest) { this.statusTest(value); }
    return this;
  }
}

module.exports = MockResponse;
