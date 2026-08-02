import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Pace Maintenance Bus Tracking System",description:"Interactive facility-wide fleet location and maintenance tracking board."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}