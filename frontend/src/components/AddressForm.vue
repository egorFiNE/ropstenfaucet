<script setup>
import Alert from './Alert.vue'
</script>

<template>
  <div style="{ opacity: isLoading ? 0.5 : 1 }" class="form-faucet">
    <form @submit.prevent="giveMe" :disabled="isLoading">
      <div class="form-floating">
        <input ref="input" type="text" v-model="address" @input="reset" :disabled="isLoading" class="form-control mb-2" id="address" placeholder="0x.....">
        <label for="address">Your Ropsten address</label>
      </div>

      <button class="w-100 btn btn-lg btn-primary" type="submit" :disabled="isLoading || !isValid">Give me Ropsten eth!</button>
    </form>

    <alert v-if="state == 'success'" kind="success">
      <small>
        Sent <b>{{ $format18(amountSent) }}</b> to {{ addressSent }} with tx hash <a :href="'https://ropsten.etherscan.io/tx/' + tx">{{ txHr }}</a>.
      </small>
    </alert>

    <alert v-else-if="state == 'limited'" kind="warning">
      Address limited. Please retry in <b>{{ liftInHr }}</b> at <b>{{ liftAtHr }}.</b>
    </alert>

    <alert v-else-if="state == 'empty'" kind="danger">
      Faucet is empty. Please notify me on <a href="https://twitter.com/egorfine">Twitter</a> so that I mine some more rETH.
    </alert>

    <alert v-else-if="state == 'fail'" kind="danger">
      {{ message }}
    </alert>

    <div v-else class="text-muted mt-1 small">
      Please enter valid Ethereum address to get free Ropsten testnet ETH.
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat)

export default {
  data() {
    return {
      state: 'idle',

      message: null,
      address: '',
      addressSent: '',
      amountSent: 0n,
      tx: null,
      liftAtUnixtime: 0
    };
  },

  computed: {
    isLoading() {
      return this.state == 'loading';
    },

    isValid() {
      return this.address.startsWith('0x') && this.address.length == 42 && this.address.substr(2).match(/^[0-9A-Fa-f]+$/);
    },

    liftInHr() {
      return dayjs().to(dayjs.unix(this.liftAtUnixtime));
    },

    liftAtHr() {
      return dayjs.unix(this.liftAtUnixtime).format('LLL');
    },

    txHr() {
      const _tx = (this.tx || '').trim();
      return _tx.substr(0,6) + '..' + _tx.substr(_tx.length-6);
    }
  },

  mounted() {
    this.$refs.input.focus();
  },

  methods: {
    reset() {
      this.state = 'idle';
      this.tx = null;
      this.message = '';
    },

    async giveMe() {
      this.state = 'loading';

      this.tx = null;
      this.message = '';

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ address: this.address })
      };

      let json = null;

      try {
        const response = await window.fetch(this.$root.urlPrefix + '/api/gimme/', options);
        json = await response.json();
      } catch (e) {
        // console.error(e);
      }

      if (!json) {
        this.state = 'fail';
        this.message = "Failure :-(";
        return;
      }

      if (!json.success) {
        if (json.isLimited) {
          this.state = 'limited';
          this.liftAtUnixtime = json.liftAtUnixtime;

        } else if (json.isEmpty) {
          this.state = 'empty';

        } else {
          this.state = 'fail';
          this.message = json.message || "Oops";
        }

        return;
      }

      this.state = 'success';

      this.tx = json.tx;
      this.addressSent = json.address;
      this.amountSent = BigInt(json.amount);
      this.address = '';
    }
  }
};
</script>
