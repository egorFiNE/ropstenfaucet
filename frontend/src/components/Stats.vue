<template>
  <div v-if="$root.isStatsLoading">
    Loading stats...
  </div>

  <div v-else>
    <b>{{ $format18($root.balance) }}&nbsp;rETH</b> available now at faucet<br/>
    <a class="small" :href="'https://ropsten.etherscan.io/address/' + $root.address">{{ addressHr }}</a><br/>
    <br/>

    <b>{{ $format18($root.weiPerAddress) }}&nbsp;rETH</b> daily limit per address.
    <br/>
    <br/>

    <span class="blockNumber small danger" v-if="!$root.blockTimestamp">No last block information (stalled?)</span>
    <span class="blockNumber small danger" v-else-if="isBlockTooOld">Stalled at block {{ $root.blockNumber }} ({{ blockTimestampHr }})</span>
    <span class="blockNumber small" v-else>Currently at block {{ $root.blockNumber }}</span>
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
import { ref, onMounted, computed, getCurrentInstance } from 'vue';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

export default {
  computed: {
    blockAgeSeconds() {
      return this.$root.blockTimestamp ? Math.floor(Date.now() / 1000) - this.$root.blockTimestamp : null;
    },

    blockTimestampHr() {
      if (!this.$root.blockTimestamp) {
        return 'unknown';
      }

      return dayjs.unix(this.$root.blockTimestamp).format('LLLL');

      if (this.$root.blockAgeSeconds < 60) {
        return this.$root.blockAgeSeconds + 's ago';
      }

      return "more than 1m ago";
    },

    isBlockTooOld() {
      this.$root.blockAgeSeconds >= 135;
    },

    addressHr() {
      if (!this.$root.address) {
        return '';
      }

      return this.$root.address.substr(0, 6) + ' ... ' + this.$root.address.substr(-4);
    }
  }
}
</script>
