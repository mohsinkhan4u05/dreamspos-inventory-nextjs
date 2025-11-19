import "../../../node_modules/bootstrap/dist/css/bootstrap.min.css"
import "../../customStyle.scss"
import "../../style/css/feather.css"
import "../../style/css/line-awesome.min.css"
import "../../style/icons/tabler-icons/webfont/tabler-icons.css"
import "../../style/icons/fontawesome/css/fontawesome.min.css"
import "../../style/icons/fontawesome/css/all.min.css"
import "../../style/fonts/feather/css/iconfont.css"
import BootstrapJs from "../../components/bootstrap-js/bootstrapjs"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <BootstrapJs />
      </body>
    </html>
  )
}
