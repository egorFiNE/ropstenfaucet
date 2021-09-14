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

    <span class="blockNumber small danger" v-if="!blockTimestamp">No last block information (stalled?)</span>
    <span class="blockNumber small danger" v-else-if="isBlockTooOld">Stalled at block {{ blockNumber }} ({{ blockTimestampHr }})</span>
    <span class="blockNumber small" v-else>Currently at block {{ blockNumber }}</span>
    <br/>
  </div>
</template>

<style scoped>
.danger {
  color: rgb(167, 0, 0) !important;
}

.blockNumber {
  color: gray;
  font-weight: 300;
}
</style>

<script>
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

export default {
  data() {
    return {
      isLoading: true,
      balance: 0,
      weiPerAddress: 0,
      address: '',
      blockNumber: null,
      blockTimestamp: null
    };
  },

  computed: {
    blockAgeSeconds() {
      return this.blockTimestamp ? Math.floor(Date.now() / 1000) - this.blockTimestamp : null;
    },

    blockTimestampHr() {
      if (!this.blockTimestamp) {
        return 'unknown';
      }

      return dayjs.unix(this.blockTimestamp).format('LLLL');

      if (this.blockAgeSeconds < 60) {
        return this.blockAgeSeconds + 's ago';
      }

      return "more than 1m ago";
    },

    isBlockTooOld() {
      return this.blockAgeSeconds >= 135;
    }
  },

  mounted() {
    this.loadStats().then(() => this.isLoading = false);
    setInterval(() => this.loadStats(), 21000);
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
      this.blockTimestamp = json.blockTimestamp;
    }
  }
};
</script>
