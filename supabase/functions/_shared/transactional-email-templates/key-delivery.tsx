/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Combo_WICK'

interface KeyDeliveryProps {
  premiumKey?: string
  tier?: string
  expiresAt?: string
}

// tier ids from checkout -> what the buyer saw on the store
const TIER_NAMES: Record<string, string> = { 'trial-7day': '7-Day Trial', monthly: 'Monthly', lifetime: 'Lifetime' }
const STORE = 'https://keys.combowick.com'

const KeyDeliveryEmail = ({ premiumKey = '', tier, expiresAt }: KeyDeliveryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Combo_WICK premium key is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>COMBO_WICK</Heading>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Your premium key</Heading>
          <Text style={text}>
            Thanks for buying{tier ? <> the <strong>{TIER_NAMES[tier] || tier}</strong> plan</> : null}. Here's your key:
          </Text>
          <Section style={keyBox}>
            <Text style={keyText}>{premiumKey}</Text>
          </Section>
          <Text style={text}>Expires: <strong>{expiresAt || 'Never (Lifetime)'}</strong></Text>
          <Text style={text}>Paste this key when the COMBO_WICK hub asks for it in Roblox. Keep this email so you never lose it.</Text>
          <Text style={fineprint}>
            Want to see your key anytime? Make a free account on <Link href={`${STORE}/dashboard`} style={link}>keys.combowick.com</Link> with
            this same email address and the key shows up in your Dashboard. Need help? Open a ticket in our Discord.
          </Text>
        </Section>
        <Text style={footer}>© {SITE_NAME} · combowick.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: KeyDeliveryEmail,
  subject: 'Your Combo_WICK premium key',
  displayName: 'Premium key delivery',
  previewData: { premiumKey: 'CW-XXXX-XXXX-XXXX', tier: 'trial-7day', expiresAt: 'Nov 4, 2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const header = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brand = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '20px', fontWeight: 800 as const, letterSpacing: '4px', color: '#7c3aed', margin: 0 }
const card = { background: 'linear-gradient(180deg, #faf7ff 0%, #ffffff 100%)', border: '1px solid #ece4ff', borderRadius: '12px', padding: '32px 28px' }
const h1 = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '22px', fontWeight: 700 as const, color: '#1a1033', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4a4458', lineHeight: '1.6', margin: '0 0 16px' }
const keyBox = { background: '#1a1033', borderRadius: '10px', padding: '18px', textAlign: 'center' as const, margin: '8px 0 20px' }
const keyText = { color: '#e9e2ff', fontFamily: 'Menlo, Monaco, Consolas, monospace', fontSize: '16px', letterSpacing: '2px', margin: 0, wordBreak: 'break-all' as const }
const link = { color: '#7c3aed', textDecoration: 'underline' }
const fineprint = { fontSize: '12px', color: '#8b85a0', lineHeight: '1.5', margin: '16px 0 0' }
const footer = { fontSize: '12px', color: '#9b96b0', textAlign: 'center' as const, margin: '24px 0 0', lineHeight: '1.6' }
