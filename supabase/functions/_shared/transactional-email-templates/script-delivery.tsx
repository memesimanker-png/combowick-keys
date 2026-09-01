/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Combo_WICK'
const SITE_URL = 'https://combowick.com'

interface ScriptDeliveryProps {
  scriptTitle?: string
  scriptGame?: string
  scriptUrl?: string
  scriptCode?: string
  recipientName?: string
}

const ScriptDeliveryEmail = ({
  scriptTitle = 'Your Script',
  scriptGame,
  scriptUrl,
  scriptCode,
  recipientName,
}: ScriptDeliveryProps) => {
  const code = (scriptCode ?? '').slice(0, 8000)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{scriptTitle} — your script from {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>COMBO_WICK</Heading>
          </Section>
          <Section style={card}>
            <Heading style={h1}>{recipientName ? `Hey ${recipientName}, ` : ''}your script is ready 🎮</Heading>
            <Text style={text}>
              Here's <strong>{scriptTitle}</strong>{scriptGame ? <> for <strong>{scriptGame}</strong></> : null}. Copy the code below into your executor and you're set.
            </Text>
            {scriptUrl ? (
              <Section style={btnWrap}>
                <Button style={button} href={scriptUrl}>Open Script Page</Button>
              </Section>
            ) : null}
            {code ? (
              <Section style={codeWrap}>
                <Text style={codeLabel}>Script</Text>
                <pre style={pre}><code style={codeStyle}>{code}</code></pre>
              </Section>
            ) : null}
            <Text style={fineprint}>
              Always run scripts on a trusted executor. Need help? Visit{' '}
              <Link href={SITE_URL} style={link}>combowick.com</Link>.
            </Text>
          </Section>
          <Text style={footer}>
            You requested this from {SITE_NAME}.<br />
            © {SITE_NAME} · combowick.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ScriptDeliveryEmail,
  subject: (data: Record<string, any>) =>
    data?.scriptTitle ? `${data.scriptTitle} — your script from Combo_WICK` : 'Your script from Combo_WICK',
  displayName: 'Script delivery',
  previewData: {
    scriptTitle: 'Blade Ball Auto Parry',
    scriptGame: 'Blade Ball',
    scriptUrl: 'https://combowick.com/scripts/blade-ball-auto-parry',
    scriptCode: 'loadstring(game:HttpGet("https://example.com/script.lua"))()',
    recipientName: 'Player',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '0 16px' }
const header = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brand = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '20px', fontWeight: 800 as const, letterSpacing: '4px', color: '#7c3aed', margin: 0 }
const card = { background: 'linear-gradient(180deg, #faf7ff 0%, #ffffff 100%)', border: '1px solid #ece4ff', borderRadius: '12px', padding: '32px 28px' }
const h1 = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '22px', fontWeight: 700 as const, color: '#1a1033', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4a4458', lineHeight: '1.6', margin: '0 0 20px' }
const btnWrap = { textAlign: 'center' as const, margin: '8px 0 20px' }
const button = { background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '10px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }
const codeWrap = { margin: '16px 0 8px' }
const codeLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#7c3aed', margin: '0 0 6px', fontWeight: 700 as const }
const pre = { background: '#1a1033', borderRadius: '10px', padding: '16px', overflow: 'auto' as const, margin: 0 }
const codeStyle = { color: '#e9e2ff', fontFamily: 'Menlo, Monaco, Consolas, monospace', fontSize: '12px', lineHeight: '1.5', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const }
const link = { color: '#7c3aed', textDecoration: 'underline' }
const fineprint = { fontSize: '12px', color: '#8b85a0', lineHeight: '1.5', margin: '16px 0 0' }
const footer = { fontSize: '12px', color: '#9b96b0', textAlign: 'center' as const, margin: '24px 0 0', lineHeight: '1.6' }
