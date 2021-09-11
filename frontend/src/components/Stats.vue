<template>
  <div v-if="isLoading">
    Loading stats...
  </div>

  <div v-else>
    <b>{{ $format18(balance) }}&nbsp;rETH</b> available now at faucet<br/>
    <a class="small" :href="'https://ropsten.etherscan.io/address/' + address">{{ address }}</a><br/>
    <br/>

    <b>{{ $format18(weiPerAddress) }}&nbsp;rETH</b> daily limit per address.
    <br/>
    <br/>
    <span class="blockNumber small">Current at block {{ blockNumber }}.</span>

  </div>
</template>

<style scoped>
.blockNumber {
  color: gray;
  font-weight: 300;
}
</style>

<script>
export default {
  data() {
    return {
      isLoading: true,
      balance: 0,
      weiPerAddress: 0,
      address: '',
      blockNumber: ''
    };
  },

  mounted() {
    this.loadStats().then(() => this.isLoading = false);
    setInterval(() => this.loadStats(), 15000);
  },

  methods: {
    async loadStats() {
      let statusCode = null;
      let json = null;

      try {
        const response = await window.fetch(this.$root.urlPrefix + '/api/stats/');
        statusCode = response.status;
        json = await response.json();
      } catch (e) {
        // console.error(e);
      }

      if (!json) {
        return;
      }

      this.balance = BigInt(json.balance);
      this.weiPerAddress = BigInt(json.weiPerAddress);
      this.address = json.address;
      this.blockNumber = json.blockNumber;
    }
  }
};
</script>
