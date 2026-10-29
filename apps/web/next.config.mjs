// ADR-003：体验页运行期开始消费 @mohen/agent-runtime（理解/选择）与 @mohen/data-access（只读检索）
const nextConfig = {
  transpilePackages: ["@mohen/experience-engine", "@mohen/agent-runtime", "@mohen/data-access"],
  // K4：PDF 文本抽取走 Node 原生模块，不参与前端打包。
  serverExternalPackages: ["pdf-parse"],
};
export default nextConfig;
