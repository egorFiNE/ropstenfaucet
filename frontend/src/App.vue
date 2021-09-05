<script setup>
import AddressForm from './components/AddressForm.vue'
import Stats from './components/Stats.vue'
</script>

<template>
  <h1>Ropsten faucet</h1>
  <Stats/>
  <hr/>
  <AddressForm/>
  <hr/>
  FIXME footer and copy
</template>

<script>
export default {
  data() {
    return {
      urlPrefix: import.meta.env.PROD ? '' : 'http://localhost:3090'
    };
  }
};
</script>
