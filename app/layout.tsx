import type { Metadata, Viewport } from "next";
import "./globals.css";
import CrashGuard from "./crash-guard";
export const metadata: Metadata = {
 title:"FLEETSTEP — Fleet Maintenance",
 description:"Interactive facility-wide fleet location and maintenance tracking board.",
 manifest:"/manifest.webmanifest",
 icons:{icon:"/favicon.svg",apple:"/favicon.svg"},
 appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"FLEETSTEP"}
};
export const viewport: Viewport = {themeColor:"#06275c"};
/* Every page is inside the boundary, because every page can throw and none of
   them can be reloaded from a home screen without it. */
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><CrashGuard>{children}</CrashGuard></body></html>}
