<template>
<main class="container mt-5">
	<!--
  <div class="text-danger fs-4 text-center my-5">
    <b>Dec 10, 08:46 UTC</b><br/>Warning! It seems that Ropsten network is either congested or split at the moment. Transactions may fail.
  </div>
	-->
  <div class="row">
    <div class="col-md-6 my-4 col-sm-12">
      <h1 class="h3 mb-4 fw-normal">Ropsten testnet faucet</h1>
      <AddressForm/>
    </div>

    <div class="col-md-6 my-4 col-sm-12 text-muted">
      <h1 class="h3 mb-4 fw-light">Faucet stats</h1>
      <Stats/>
    </div>

    <div class="col-md-6 my-4 col-sm-12">
      <h1 class="h3 mb-4 fw-normal">Need more rETH?</h1>

      <div>
        <p>
          Most probably you don't.
        </p>

        <p>
          There is no USDT on Ropsten, there is no price for Ropsten ETH, every amount and
          <b>every price is arbitrary</b> and transactions cost pennies. You can test everything
          with arbitrary rETH amount.
        </p>

        <p>
          If you need to test something that depends on
          fixed ETH values, you can either scale everything down 10x or 1000x or use wrapped ETH and change
          <code>decimals()</code> to something smaller than the usual 18.
        </p>
      </div>
    </div>

    <div class="col-md-6 my-4 col-sm-12">
      <h1 class="h3 mb-4 fw-normal">Please donate</h1>

      <div>
        <p>
          This faucet is now depleting faster than I can mine. Please send your <b>unused Ropsten ETH</b> back to the faucet
          to share with fellow developers.
        </p>

        <p>
          Please also <b>consider donating.</b> Your funds will help me continue running miner hardware for Ropsten and other PoW testnets.
          I accept donations on the same address on pretty much all major EVM network. Much appreciated!
        </p>

        <p class="fw-bold ">
          Please send rETH and/or donations to:
        </p>

        <p class="">
          <code style="color: gray" class="me-2">{{ donationsToAddress }}</code>
          <span v-if="isCopied" class="copy-address">✓</span>
          <span v-else @click.prevent="copyAddress" class="copy-address">
            <svg width="13" aria-hidden="true" focusable="false" data-prefix="far" data-icon="copy" class="svg-inline--fa fa-copy fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M433.941 65.941l-51.882-51.882A48 48 0 0 0 348.118 0H176c-26.51 0-48 21.49-48 48v48H48c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48v-48h80c26.51 0 48-21.49 48-48V99.882a48 48 0 0 0-14.059-33.941zM266 464H54a6 6 0 0 1-6-6V150a6 6 0 0 1 6-6h74v224c0 26.51 21.49 48 48 48h96v42a6 6 0 0 1-6 6zm128-96H182a6 6 0 0 1-6-6V54a6 6 0 0 1 6-6h106v88c0 13.255 10.745 24 24 24h88v202a6 6 0 0 1-6 6zm6-256h-64V48h9.632c1.591 0 3.117.632 4.243 1.757l48.368 48.368a6 6 0 0 1 1.757 4.243V112z"></path></svg>
          </span>
        </p>
      </div>
    </div>
  </div>

  <p class="mt-5 mb-1 text-muted">
    &copy; 2021-2022 Egor Egorov
  </p>

  <p class="mb-3 text-muted small">
    <a href="https://github.com/egorFiNE/ropstenfaucet">github</a>
    <span class="ms-2 separator">|</span>
    <a class="ms-2" href="https://twitter.com/egorFiNE">twitter</a>
    <span class="ms-2 separator">|</span>
    <a class="ms-2" href="mailto:me@egorfine.com">me@egorfine.com</a>
  </p>
</main>
</template>

<script>
import AddressForm from './components/AddressForm.vue'
import Stats from './components/Stats.vue'

export default {
  components: {
    AddressForm,
    Stats
  },

  setup() {
    window.urlPrefix = import.meta.env.PROD ? '' : 'http://localhost:3090';
  },

  data() {
    return {
      urlPrefix: import.meta.env.PROD ? '' : 'http://localhost:3090',

      isStatsLoading: true,
      balance: 0,
      weiPerAddress: 0,
      address: '',
      donationsToAddress: '',
      blockNumber: null,
      blockTimestamp: null,
      isCopied: false
    };
  },

  computed: {
    addressHr() {
      if (!this.address) {
        return '';
      }

      return this.address.substr(0, 6) + ' ... ' + this.address.substr(-4);
    }
  },

  mounted() {
    this.loadStats();
    setInterval(this.loadStats.bind(this), 30000);
  },

  methods: {
    async loadStats() {
      let json = null;

      try {
        const response = await window.fetch(window.urlPrefix + '/api/stats/');
        json = await response.json();
      } catch {}

      if (!json) {
        return;
      }

      this.balance = BigInt(json.balance);
      this.weiPerAddress = BigInt(json.weiPerAddress);
      this.address = json.address;
      this.donationsToAddress = json.donationsToAddress;
      this.blockNumber = json.blockNumber;
      this.blockTimestamp = json.blockTimestamp;

      this.isStatsLoading = false;
    },

    copyAddress() {
      navigator.clipboard.writeText(this.donationsToAddress);
      this.isCopied = true;
      setTimeout(() => this.isCopied = false, 1000);
    }
  }
};
</script>

<style scoped>
.copy-address {
  color: rgb(60, 149, 232);
  cursor: pointer
}
</style>