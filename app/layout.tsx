import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title:"TransitKey — Fleet Maintenance",
 description:"Interactive facility-wide fleet location and maintenance tracking board.",
 manifest:"/manifest.webmanifest",
 icons:{icon:"/favicon.svg",apple:"/favicon.svg"},
 appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"TransitKey"}
};
export const viewport: Viewport = {themeColor:"#06275c"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
