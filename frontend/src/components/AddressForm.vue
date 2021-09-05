<template>
  <div style="{ opacity: isLoading ? 0.5 : 1 }">
    <form @submit.prevent="giveMe" :disabled="isLoading">
      <input v-model="address" @input="reset" :disabled="isLoading">
      <button type="submit" :disabled="isLoading || !isValid">Gimme</button>
    </form>

    <div v-if="state == 'success'">
      Okay! Sent {{ $format18(amountSent) }} to {{ addressSent }} with tx <a :href="'https://ropsten.etherscan.io/tx/' + tx">{{ tx }}</a>.
    </div>

    <div v-else-if="state == 'limited'">
      Oops! Limit engaged, please retry in {{ liftInHr }} at {{ liftAtHr }}
    </div>

    <div v-else-if="state == 'empty'">
      Oops! Faucet empty. <a href="https://twitter.com/egorfine">Hit me up on Twitter</a> so that I mine some more.
    </div>

    <div v-else-if="state == 'fail'">
      {{ message }}
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
      // isLoading: false,
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
      this.state == 'loading';
    },

    isValid() {
      return this.address.startsWith('0x') && this.address.length == 42 && this.address.substr(2).match(/^[0-9A-Fa-f]+$/);
    },

    liftInHr() {
      return dayjs().to(dayjs.unix(this.liftAtUnixtime));
    },

    liftAtHr() {
      return dayjs.unix(this.liftAtUnixtime).format('LLL');
    }
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
