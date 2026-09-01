/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Combo_WICK'

interface ContactConfirmationProps {
  name?: string
  subject?: string
}

const ContactConfirmationEmail = ({ name, subject }: ContactConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We got your message — Combo_WICK</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>COMBO_WICK</Heading>
        </Section>
        <Section style={card}>
          <Heading style={h1}>{name ? `Thanks, ${name}!` : 'Thanks for reaching out!'}</Heading>
          <Text style={text}>
            We received your message{subject ? <> about <strong>{subject}</strong></> : null} and will reply as soon as we can.
          </Text>
          <Text style={text}>For faster help, join our Discord linked on the site.</Text>
        </Section>
        <Text style={footer}>© {SITE_NAME} · combowick.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'We received your message',
  displayName: 'Contact confirmation',
  previewData: { name: 'Jane', subject: 'Script not working' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const header = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brand = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '20px', fontWeight: 800 as const, letterSpacing: '4px', color: '#7c3aed', margin: 0 }
const card = { background: 'linear-gradient(180deg, #faf7ff 0%, #ffffff 100%)', border: '1px solid #ece4ff', borderRadius: '12px', padding: '32px 28px' }
const h1 = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '22px', fontWeight: 700 as const, color: '#1a1033', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4a4458', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#9b96b0', textAlign: 'center' as const, margin: '24px 0 0', lineHeight: '1.6' }
