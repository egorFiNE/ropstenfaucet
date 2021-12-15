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

<script setup>
import { ref, onMounted, computed, getCurrentInstance } from 'vue';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

const app = getCurrentInstance();

const blockAgeSeconds = computed(() => app.ctx.$root.blockTimestamp ? Math.floor(Date.now() / 1000) - app.ctx.$root.blockTimestamp : null);

const blockTimestampHr = computed(() => {
  if (!app.ctx.$root.blockTimestamp) {
    return 'unknown';
  }

  return dayjs.unix(app.ctx.$root.blockTimestamp).format('LLLL');

  if (app.ctx.$root.blockAgeSeconds < 60) {
    return app.ctx.$root.blockAgeSeconds + 's ago';
  }

  return "more than 1m ago";
});

const isBlockTooOld = computed(() => (app.ctx.$root.blockAgeSeconds >= 135));

const addressHr = computed(() => {
  if (!app.ctx.$root.address) {
    return '';
  }

  return app.ctx.$root.address.substr(0, 6) + ' ... ' + app.ctx.$root.address.substr(-4);
});
</script>
