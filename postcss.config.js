import autoprefixer from "autoprefixer";

const isProduction = process.env.NODE_ENV === "production";

const config = {
  plugins: [...(isProduction && [autoprefixer({})])],
};

export default config;
