const formatter = new Intl.NumberFormat('en-US', { useGrouping: true, minimumFractionDigits: 4 });

export function format18(value) {
  const b = BigInt(value) / 10n ** 14n;
  return formatter.format(Number(b.toString()) / 10**4);
}

export default {
  install: (app) => {
    app.config.globalProperties.$format18 = (value, defaultValue = '') => {
      if ((value ?? null) === null) {
        return defaultValue;
      }

      return format18(value);
    };
  }
};
