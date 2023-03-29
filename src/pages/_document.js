import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body style={{background: 'linear-gradient(90deg, rgba(10,116,255,1) 0%, rgba(52,122,202,1) 38%, rgba(0,228,173,1) 100%) '}}>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
