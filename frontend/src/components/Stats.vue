<template>
  <div v-if="isLoading">
    Loading stats...
  </div>

  <div v-else>
    <b>{{ $format18(balance) }}&nbsp;rETH</b> available now at faucet<br/>
    <a class="small" :href="'https://ropsten.etherscan.io/address/' + address">{{ addressHr }}</a><br/>
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

<script setup>
import { ref, onMounted, computed, inject } from 'vue';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

const isLoading = ref(true);
const balance = ref(0);
const weiPerAddress = ref(0);
const address = ref('');
const blockNumber = ref(null);
const blockTimestamp = ref(null);

const loadStats = async () => {
  let json = null;

  try {
    const response = await window.fetch(inject('urlPrefix') + '/api/stats/');
    json = await response.json();
  } catch {}

  if (!json) {
    return;
  }

  balance.value = BigInt(json.balance);
  weiPerAddress.value = BigInt(json.weiPerAddress);
  address.value = json.address;
  blockNumber.value = json.blockNumber;
  blockTimestamp.value = json.blockTimestamp;
};

onMounted(async () => {
  await loadStats();
  isLoading.value = false;
  setInterval(loadStats, 21000);
});

const blockAgeSeconds = computed(() => blockTimestamp.value ? Math.floor(Date.now() / 1000) - blockTimestamp.value : null);

const blockTimestampHr = computed(() => {
  if (!blockTimestamp.value) {
    return 'unknown';
  }

  return dayjs.unix(blockTimestamp.value).format('LLLL');

  if (blockAgeSeconds.value < 60) {
    return blockAgeSeconds.value + 's ago';
  }

  return "more than 1m ago";
});

const addressHr = computed(() => {
  if (!address.value) {
    return '';
  }

  return address.value.substr(0, 6) + ' ... ' + address.value.substr(-4);
});

const isBlockTooOld = computed(() => (blockAgeSeconds.value >= 135));
</script>
