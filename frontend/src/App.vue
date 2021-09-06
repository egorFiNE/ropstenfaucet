<template>
<main class="container">
  <div class="row">
    <div class="col-6">
      <h1 class="h3 mb-3 fw-normal">Ropsten testnet faucet</h1>
      <AddressForm/>
    </div>

    <div class="col-6 text-muted">
      <h1 class="h3 mb-3 fw-light">Faucet stats</h1>
      <Stats/>
    </div>
  </div>

  <div class="row mt-5">
    <div class="col-6">
      <Faq/>
    </div>
  </div>

  <p class="mt-5 mb-3 text-muted">
    &copy; 2021 Egor Egorov
    <span class="ms-2 separator">|</span>
    <a class="ms-2" href="https://github.com/egorFiNE/ropstenfaucet">github</a>
    <span class="ms-2 separator">|</span>
    <a class="ms-2" href="https://twitter.com/egorFiNE">twitter</a>
  </p>
</main>
</template>

<script>
import AddressForm from './components/AddressForm.vue'
import Stats from './components/Stats.vue'
import Faq from './components/Faq.vue'

export default {
  components: {
    AddressForm,
    Stats,
    Faq
  },

  data() {
    return {
      urlPrefix: import.meta.env.PROD ? '' : 'http://localhost:3090'
    };
  }
};
</script>
