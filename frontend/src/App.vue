<template>
<main class="container mt-5">
  <div class="text-danger fs-4 text-center my-5">
    <b>Dec 10, 08:46 UTC</b><br/>Warning! It seems that Ropsten network is either congested or split at the moment. Transactions may fail.
  </div>

  <div class="row">
    <div class="col-md-6 col-sm-12">
      <h1 class="h3 mt-3 mb-4 fw-normal">Ropsten testnet faucet</h1>
      <AddressForm/>
    </div>

    <div class="col-md-6 col-sm-12 text-muted">
      <h1 class="h3 mt-3 mb-4 fw-light">Faucet stats</h1>
      <Stats/>
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
      urlPrefix: import.meta.env.PROD ? '' : 'http://localhost:3090'
    };
  }
};
</script>
