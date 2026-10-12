const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: new URL("./src", import.meta.url).pathname,
    },
  },
};
export default config;
