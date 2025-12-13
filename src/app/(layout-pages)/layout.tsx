import "bootstrap/dist/css/bootstrap.min.css";  // Bootstrap resolves automatically
import "../../customStyle.scss";
import "../../style/css/feather.css";
import "../../style/css/line-awesome.min.css";
import "../../style/icons/tabler-icons/webfont/tabler-icons.css";
import "../../style/icons/fontawesome/css/fontawesome.min.css";
import "../../style/icons/fontawesome/css/all.min.css";
import "../../style/fonts/feather/css/iconfont.css";


import LayoutClientWrapper from "./LayoutClientWrapper";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LayoutClientWrapper>{children}</LayoutClientWrapper>;
}
