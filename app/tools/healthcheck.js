const http = require('http');


const host = process.env.OPENTMI_HOST || 'localhost';
const port = process.env.OPENTMI_PORT || '8000';

const options = {host, port, timeout: 2000};

const request = http.request(options, (res) => {
  // eslint-disable-next-line no-console
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.log(`${err}`);
  process.exit(1);
});

request.end();
