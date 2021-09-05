<template>
  <h1>Stats</h1>

  <div v-if="isLoading">
    Loading...
  </div>

  <div v-else>
    Faucet balance: {{ $format18(balance) }}<br/>
    Faucet address: <a :href="'https://ropsten.etherscan.io/address/' + address">{{ address }}</a><br/>
    Giving today per address: {{ $format18(weiPerAddress) }}
  </div>
</template>

<script>
export default {
  data() {
    return {
      isLoading: true,
      balance: 0,
      weiPerAddress: 0,
      address: ''
    };
  },

  mounted() {
    this.loadStats();
    setInterval(() => this.loadStats(), 15000);
  },

  methods: {
    async loadStats() {
      this.isLoading = true;

      let statusCode = null;
      let json = null;

      try {
        const response = await window.fetch(this.$root.urlPrefix + '/api/stats/');
        statusCode = response.status;
        json = await response.json();
      } catch (e) {
        // console.error(e);
      }

      this.isLoading = false;

      if (!json) {
        return;
      }

      this.balance = BigInt(json.balance);
      this.weiPerAddress = BigInt(json.weiPerAddress);
      this.address = json.address;
    }
  }
};
</script>
