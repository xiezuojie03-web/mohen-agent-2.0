import "./styles.css";
import "./five-ui.css";
import "./studio.css";
import "./explore.css";
import "./watch.css";
import "./admin.css";
import "./auth.css";
import GlobalNav from "./components/GlobalNav";

export const metadata = {
  title: "墨痕 MoHen",
  description: "从广阔历史中发现与今天生活的连接",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <GlobalNav />
        {children}
      </body>
    </html>
  );
}
