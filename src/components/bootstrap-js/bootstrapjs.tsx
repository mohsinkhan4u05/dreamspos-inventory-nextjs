"use client"

import Script from "next/script"

export default function BootstrapJs(){
    return (
        <Script 
            src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
            strategy="afterInteractive"
        />
    )
}