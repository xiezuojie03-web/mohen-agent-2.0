import "./styles.css";
export const metadata = { title: "墨痕 Agent 2.0", description: "Foundation health surface" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
