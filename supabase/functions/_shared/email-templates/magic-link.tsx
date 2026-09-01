/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Combo_WICK login link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Heading style={brand}>COMBO_WICK</Heading></Section>
        <Section style={card}>
          <Heading style={h1}>Log in to Combo_WICK</Heading>
          <Text style={text}>Tap the button below to log in. This link expires shortly.</Text>
          <Section style={btnWrap}><Button style={button} href={confirmationUrl}>Log In</Button></Section>
          <Text style={fineprint}>Didn't request this? You can safely ignore this email.</Text>
        </Section>
        <Text style={footer}>© Combo_WICK · combowick.com</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const header = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brand = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '20px', fontWeight: 800 as const, letterSpacing: '4px', color: '#7c3aed', margin: 0 }
const card = { background: 'linear-gradient(180deg, #faf7ff 0%, #ffffff 100%)', border: '1px solid #ece4ff', borderRadius: '12px', padding: '32px 28px' }
const h1 = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '24px', fontWeight: 700 as const, color: '#1a1033', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4a4458', lineHeight: '1.6', margin: '0 0 24px' }
const btnWrap = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = { background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '10px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }
const fineprint = { fontSize: '12px', color: '#8b85a0', lineHeight: '1.5', margin: '16px 0 0' }
const footer = { fontSize: '12px', color: '#9b96b0', textAlign: 'center' as const, margin: '24px 0 0', lineHeight: '1.6' }
