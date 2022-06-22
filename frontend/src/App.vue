<template>
<main class="container mt-5">

  <div class="alert alert-primary fs-4 text-center my-5">
    Warning! Ropsten will be shut down in Q4 2022.
    <br/><br/>
    More info in <a href="https://blog.ethereum.org/2022/06/21/testnet-deprecation/">Ethereum Foundation blog</a>.
  </div>

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
          There is no USDT on Ropsten, there is no market for Ropsten ETH, <b>every amount and
          every price on Ropsten is arbitrary</b> and transactions cost pennies.
        </p>
      </div>
    </div>

    <div class="col-md-6 my-4 col-sm-12">
      <h1 class="h3 mb-4 fw-normal">Did not receive your rETH?</h1>

      <div>
        EVM blockchains in general and Ropsten in particular are incredibly fragile, unreliable and hostile environments. Transactions do get lost,
        sometimes fail to mine, gas limits are estimated incorrectly, network explorer loses records, etc. Infura sometimes misreport
        nonces, and Alchemy sometimes reports non-existing transactions.
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
      blockNumber: null,
      blockTimestamp: null,
      queueSize: null,
      isCopied: false,
      currentTransactionAgeSeconds: 0,
      currentTransactionHash: null,
      sponsor: null
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
      this.blockNumber = json.blockNumber;
      this.blockTimestamp = json.blockTimestamp;
      this.queueSize = json.queueSize;
      this.currentTransactionHash = json.currentTransactionHash;
      this.currentTransactionAgeSeconds = json.currentTransactionAgeSeconds;

      this.sponsor = json.sponsor;

      this.isStatsLoading = false;
    },

    copyAddress() {
      navigator.clipboard.writeText(this.sponsor);
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
