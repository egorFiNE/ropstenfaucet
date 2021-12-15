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

    <div class="col-md-12 my-4 col-sm-12">
      <div class="alert alert-success" role="alert">
        <h1 class="h3 mb-4 fw-normal">Please donate Ropsten ETH!</h1>

        <div>
          <p>
            This faucet is now depleting faster than I can mine. Please send your unused ropsten ETH back to the faucet
            to share with fellow developers.
          </p>
          <p class="fw-bold">
            Please send rETH to:
          </p>
          <p>
            <code style="color: gray" class="me-2">{{ address }}</code>
            <span v-if="isCopied" class="text-muted text-decoration-underline">copied</span>
            <a v-else href="#" @click.prevent="copyAddress">click to copy</a>
          </p>
        </div>
      </div>
    </div>
  </div>

  <p class="mt-5 mb-1 text-muted">
    &copy; 2021 Egor Egorov
  </p>

  <p class="mb-3 text-muted">
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
      this.blockNumber = json.blockNumber;
      this.blockTimestamp = json.blockTimestamp;

      this.isStatsLoading = false;
    },

    copyAddress() {
      navigator.clipboard.writeText(this.address);
      this.isCopied = true;
      setTimeout(() => this.isCopied = false, 1000);
    }
  }
};
</script>
