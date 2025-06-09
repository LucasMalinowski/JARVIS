module.exports = {
  content: [
    "./public/*.html",
    "./app/helpers/**/*.rb",
    "./app/javascript/**/*.js",
    "./app/views/**/*.{erb,haml,html,slim}",
    "./app/components/**/*",
  ],
  theme: {
    extend: {
      colors: {
        teal: "#02FEFF",
      }
    },
  },
  plugins: [],
};
