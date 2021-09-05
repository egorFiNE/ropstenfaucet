'use strict';

module.exports = {
	apps : [
    {
      name: "ropstenfaucet",
      script: 'index.mjs',
      instances: 1,
      kill_timeout: 2 * 1000,
      watch: false,
      wait_ready: true
    }
  ]
};
