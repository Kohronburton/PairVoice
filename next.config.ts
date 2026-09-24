import type {NextConfig} from 'next';

const nextConfig:NextConfig={
  // Keep Next's typecheck on the stable compiler API. TypeScript 5.9's CLI
  // emits configuration output that Next 16.3.6 cannot parse in this project.
  experimental:{useTypeScriptCli:false},
};

export default nextConfig;
