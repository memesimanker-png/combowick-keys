/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Sent once to a $5 trial buyer whose trial ended without an upgrade (trial-winback function).
// The code is single use, minted for this email address only (executor promo_coupons, kind "winback").
const SITE_NAME = 'Combo_WICK'

interface TrialWinbackProps {
  code?: string
  expires?: string          // already formatted, e.g. "Nov 4"
  link?: string             // https://keys.combowick.com/premium-keys?promo=CODE
  unsubscribeUrl?: string   // added by send-transactional-email
}

const TrialWinbackEmail = ({ code = 'TRIAL-XXXXXX', expires = 'in 7 days', link = 'https://keys.combowick.com/premium-keys', unsubscribeUrl }: TrialWinbackProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>20% off to keep Premium, your code inside</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>COMBO_WICK</Heading>
        </Section>
        <Section style={card}>
          <Text style={text}>Hey,</Text>
          <Text style={text}>Your 7-day Premium trial for COMBO_WICK has ended. Thanks for trying it.</Text>
          <Text style={text}>If you want to keep skipping the key steps, here's 20% off Premium, just for you:</Text>
          <Section style={codeBox}>
            <Text style={codeLabel}>YOUR CODE</Text>
            <Text style={codeText}>{code}</Text>
            <Text style={priceText}>Monthly from $7.99 (normally $9.99)<br />Lifetime from $39.99 (normally $49.99)</Text>
          </Section>
          <Text style={text}>The code works once and runs out on {expires}.</Text>
          <Section style={{ textAlign: 'center' as const, margin: '8px 0 20px' }}>
            <Button href={link} style={button}>Get Premium with 20% off</Button>
          </Section>
          <Text style={small}>You can pay with PayPal or any debit/credit card, no PayPal account needed.</Text>
          <Text style={small}>Questions? Ask us on Discord: <Link href="https://discord.gg/9FWBQnVXCy" style={link2}>discord.gg/9FWBQnVXCy</Link></Text>
          <Text style={text}>COMBO_WICK</Text>
        </Section>
        <Text style={footer}>
          © {SITE_NAME} · combowick.com
          {unsubscribeUrl ? <><br /><Link href={unsubscribeUrl} style={footerLink}>Don't want these emails? Unsubscribe</Link></> : null}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrialWinbackEmail,
  subject: 'Your COMBO_WICK trial ended (20% off to keep Premium)',
  displayName: 'Trial ended: 20% off',
  previewData: { code: 'TRIAL-AB12CD', expires: 'Nov 4', link: 'https://keys.combowick.com/premium-keys?promo=TRIAL-AB12CD' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const header = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brand = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '20px', fontWeight: 800 as const, letterSpacing: '4px', color: '#b8860b', margin: 0 }
const card = { background: '#fffdf6', border: '1px solid #f1e3b5', borderRadius: '12px', padding: '28px 28px 12px' }
const text = { fontSize: '15px', color: '#3d3a33', lineHeight: '1.6', margin: '0 0 14px' }
const small = { fontSize: '13px', color: '#6b675d', lineHeight: '1.6', margin: '0 0 10px' }
const codeBox = { background: '#111111', borderRadius: '10px', padding: '16px', margin: '4px 0 16px', textAlign: 'center' as const }
const codeLabel = { fontSize: '11px', letterSpacing: '3px', color: '#9ca3af', margin: '0 0 4px' }
const codeText = { fontFamily: 'Consolas, Menlo, monospace', fontSize: '24px', fontWeight: 700 as const, letterSpacing: '2px', color: '#f5b700', margin: '0 0 10px' }
const priceText = { fontSize: '13px', color: '#e5e7eb', lineHeight: '1.6', margin: 0 }
const button = { backgroundColor: '#f5b700', color: '#141006', fontWeight: 700 as const, fontSize: '15px', borderRadius: '8px', padding: '12px 22px', textDecoration: 'none' }
const link2 = { color: '#b8860b' }
const footer = { fontSize: '12px', color: '#9b96b0', textAlign: 'center' as const, margin: '24px 0 0', lineHeight: '1.6' }
const footerLink = { color: '#9b96b0', textDecoration: 'underline' }
